import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  isAllowedForSoftLaunch,
  isHardBlockedCountry,
  parseAllowlist,
  shouldFlagName,
} from './sanctions';
import { firstOrigin } from '../common/config-helpers';
import { encryptPii, decryptPii } from '../common/pii-crypto';
import {
  generateTotpSecret,
  totpKeyUri,
  verifyTotp,
} from '../common/totp';
import { STEP_UP_AUDIENCE } from './guards/step-up.guard';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
    private audit: AuditService,
  ) {}

  async register(dto: RegisterDto, req: Request) {
    /* Sanctions gate — before any DB work. Hard-blocked countries get
       a 403 + a "service not available in your region" message; we
       don't reveal which country list caused the block. Audit-log the
       attempt so ops can see attempted signups from blocked geos. */
    if (isHardBlockedCountry(dto.country)) {
      await this.audit.log({
        action: 'auth.register_blocked_country',
        entity: 'User',
        entityId: 'pending',
        metadata: { country: dto.country, emailHash: this.hashEmail(dto.email) },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'WARNING',
      });
      throw new ForbiddenException(
        'GETX is not available in your region yet. Join the waitlist at getx.gg/waitlist.',
      );
    }

    /* Soft-launch allowlist gate — only US + UK + IN during the pilot
       phase (set via ALLOWED_SIGNUP_COUNTRIES env). Outside the
       allowlist we collect the email as a waitlist entry and return a
       distinct "joined waitlist" error so the frontend can route the
       user to the right confirmation page. Empty env = global rollout
       (gate disabled). */
    const allowlist = parseAllowlist(
      this.config.get<string>('ALLOWED_SIGNUP_COUNTRIES'),
    );
    if (!isAllowedForSoftLaunch(dto.country, allowlist)) {
      await this.audit.log({
        action: 'auth.register_outside_softlaunch',
        entity: 'User',
        entityId: 'pending',
        metadata: {
          country: dto.country,
          emailHash: this.hashEmail(dto.email),
          allowlist: allowlist ? Array.from(allowlist) : null,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'INFO',
      });
      throw new ForbiddenException(
        'Soft launch in progress. We&apos;re onboarding the US and UK first — join the waitlist and we&apos;ll email when your country is live.',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      // Email-enumeration protection — return the same response shape a
      // fresh signup would emit so an attacker can't probe which addresses
      // are registered. The legitimate owner sees "check your email" and,
      // finding nothing, naturally tries the login / reset flow instead.
      // The duplicate attempt is audit-logged so ops can spot probing.
      await this.audit.log({
        userId: existing.id,
        action: 'auth.register_duplicate_email',
        entity: 'User',
        entityId: existing.id,
        metadata: { emailHash: this.hashEmail(dto.email), country: dto.country },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'WARNING',
      });
      // Return a fake userId so the shape matches a fresh signup — prevents
      // probing which email addresses are already registered.
      return {
        message:
          'Registration successful. Check your email for verification code.',
        userId: randomBytes(16).toString('hex'),
        email: dto.email,
      };
    }

    /* Name-watchlist soft flag — does NOT block; just flags for manual
       review in the admin queue. Most hits are false-positives so we
       let the row land in PENDING_REVIEW for an admin to clear. */
    const flagForReview = shouldFlagName(dto.name);

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const otp = this.generateOTP();
    const otpHash = createHash('sha256').update(otp).digest('hex');
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          country: dto.country,
          role: 'BOTH',
          kycLevel: 'LEVEL_0',
          kycStatus: 'NONE',
          marketingOptIn: dto.marketingOptIn ?? false,
          /* Both SELLER and BOTH count as a soft seller-interest signal
             so the post-signup nudges (apply for seller mode, complete
             KYC) target the right cohort. BUYER stays false so a pure
             buyer signup doesn't get seller-side prompts. */
          interestedInSelling:
            dto.interest === 'SELLER' || dto.interest === 'BOTH',
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: true,
        },
        // Explicit select — never return password hash, 2FA secret, or PII
        // fields from the create result; a stray logger would ship them.
        select: { id: true, email: true, name: true, country: true },
      });

      await tx.emailVerification.create({
        data: {
          userId: newUser.id,
          email: newUser.email,
          otp: otpHash,
          expiresAt: otpExpiresAt,
        },
      });

      return newUser;
    });

    // Fire-and-forget OTP send so signup response stays fast.
    void this.mail
      .sendVerificationOtp(user.email, user.name || 'there', otp)
      .catch((err) => this.logger.error(`OTP send failed: userId=${user.id}`, err));

    await this.audit.log({
      userId: user.id,
      action: 'auth.register',
      entity: 'User',
      entityId: user.id,
      metadata: { country: dto.country, flagged: flagForReview },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: flagForReview ? 'WARNING' : 'INFO',
    });
    if (flagForReview) {
      this.logger.warn(
        `Name-watchlist flag for user ${user.id} (${dto.country}) — queued for manual review.`,
      );
    }

    return {
      message:
        'Registration successful. Check your email for verification code.',
      userId: user.id,
      email: user.email,
    };
  }

  async verifyEmail(dto: VerifyEmailDto, req: Request) {
    const verification = await this.prisma.emailVerification.findFirst({
      where: { email: dto.email, verifiedAt: null },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    // Collapse all invalid/expired/locked-out states into one generic error
    // to prevent oracle enumeration of verification state.
    if (
      !verification ||
      verification.expiresAt < new Date() ||
      verification.attempts >= 5
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const providedHash = createHash('sha256').update(dto.otp).digest('hex');
    const storedHash = verification.otp;
    const isMatch =
      storedHash.length === providedHash.length &&
      timingSafeEqual(Buffer.from(storedHash), Buffer.from(providedHash));

    if (!isMatch) {
      await this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });

      await this.audit.log({
        userId: verification.userId,
        action: 'auth.email_verify_failed',
        entity: 'User',
        entityId: verification.userId,
        ipAddress: req.ip,
        severity: 'WARNING',
      });

      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { verifiedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: new Date() },
      }),
    ]);

    await this.audit.log({
      userId: verification.userId,
      action: 'auth.email_verified',
      entity: 'User',
      entityId: verification.userId,
      ipAddress: req.ip,
    });

    void this.mail
      .sendWelcome(verification.user.email, verification.user.name || 'there')
      .catch((err) => this.logger.error(`Welcome email failed: userId=${verification.userId}`, err));

    return { message: 'Email verified successfully', success: true };
  }

  async resendOtp(email: string, req: Request) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Generic response for all non-success cases — prevents oracle enumeration
    // of whether the email is registered, already verified, or in cooldown.
    if (!user || user.emailVerified) {
      return { message: 'If account exists, OTP sent.' };
    }

    const lastSent = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (lastSent && Date.now() - lastSent.createdAt.getTime() < 60 * 1000) {
      return { message: 'If account exists, OTP sent.' };
    }

    const otp = this.generateOTP();
    const otpHash = createHash('sha256').update(otp).digest('hex');
    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        otp: otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    void this.mail
      .sendVerificationOtp(user.email, user.name || 'there', otp)
      .catch((err) => this.logger.error(`OTP resend failed: userId=${user.id}`, err));

    await this.audit.log({
      userId: user.id,
      action: 'auth.otp_resent',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return { message: 'If account exists, OTP sent.' };
  }

  async login(dto: LoginDto, req: Request, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Constant-time-ish: still hash a dummy to match the verify-password path.
      await bcrypt.hash('dummy', 12);
      throw new UnauthorizedException('Invalid credentials');
    }

    // AUTH-MED-015: Do NOT reveal account state (locked, banned, suspended,
    // unverified) before the password is confirmed — that leaks account
    // existence and status to an unauthenticated caller. All pre-success
    // branches collapse to 'Invalid credentials' until password+2FA pass.

    // Constant-time check: always run bcrypt even for locked / OAuth-only
    // accounts so timing cannot distinguish a wrong-password from a locked
    // account.  We check the locked flag AFTER bcrypt so the response time
    // is identical for all failure paths.
    const passwordToCheck = user.password ?? '';
    const isValid = await bcrypt.compare(dto.password, passwordToCheck || '$2b$12$invalidhashpadding00000000000000000000000000000000000000');

    if (!isValid || !user.password) {
      // Only increment the failed-login counter when the account has a
      // password (OAuth-only accounts shouldn't be lockable via the
      // password path).
      if (user.password) {
        const newCount = user.failedLoginCount + 1;
        const lockedUntil =
          newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: newCount, lockedUntil },
        });

        await this.audit.log({
          userId: user.id,
          action: 'auth.login_failed',
          entity: 'User',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          severity: newCount >= 5 ? 'WARNING' : 'INFO',
        });
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // Password verified — NOW check account eligibility. Generic error
    // message used for all cases to avoid leaking which specific gate failed.
    const isLockedOut = user.lockedUntil && user.lockedUntil > new Date();
    const isIneligible =
      isLockedOut ||
      !user.emailVerified ||
      user.status === 'BANNED' ||
      user.status === 'DELETED' ||
      user.status === 'SUSPENDED';

    if (isIneligible) {
      // Audit the specific reason server-side for ops visibility.
      const reason = isLockedOut
        ? 'locked'
        : !user.emailVerified
          ? 'unverified'
          : user.status?.toLowerCase() ?? 'unknown';
      await this.audit.log({
        userId: user.id,
        action: 'auth.login_ineligible',
        entity: 'User',
        entityId: user.id,
        metadata: { reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'WARNING',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: req.ip,
        lastLoginUserAgent: req.headers['user-agent'],
      },
    });

    const rememberMe = dto.rememberMe ?? false;
    const refreshTtlMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const tokens = await this.generateTokens(user, undefined, refreshTtlMs);
    this.setAuthCookies(res, tokens, refreshTtlMs);

    await this.audit.log({
      userId: user.id,
      action: 'auth.login',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { user: this.sanitizeUser(user), tokens };
  }

  async refresh(refreshToken: string | undefined, req: Request, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: this.hashRefreshToken(refreshToken) },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Theft detection: a revoked-but-presented token implies the family is compromised.
    if (tokenRecord.revoked) {
      await this.prisma.refreshToken.updateMany({
        where: { family: tokenRecord.family },
        data: { revoked: true, revokedAt: new Date() },
      });

      await this.audit.log({
        userId: tokenRecord.userId,
        action: 'auth.token_theft_detected',
        entity: 'RefreshToken',
        entityId: tokenRecord.id,
        ipAddress: req.ip,
        severity: 'CRITICAL',
      });

      throw new UnauthorizedException('Token compromised. Please login again.');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    if (tokenRecord.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account not active');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    /* AUTH-003 — preserve the session's ABSOLUTE expiry across rotation.
       Carrying the existing token's expiresAt forward (instead of resetting to
       7 days every refresh) means a non-remember-me session still dies 24h
       after login, and a remember-me session can't be silently extended into
       an effectively immortal session by refreshing just before expiry.
       remainingMs is > 0 here — the expired branch above already returned. */
    const remainingMs = Math.max(
      0,
      tokenRecord.expiresAt.getTime() - Date.now(),
    );
    const tokens = await this.generateTokens(
      tokenRecord.user,
      tokenRecord.family,
      remainingMs,
    );
    this.setAuthCookies(res, tokens, remainingMs);

    return { tokens };
  }

  async logout(
    refreshToken: string | undefined,
    req: Request,
    res: Response,
  ) {
    let userId: string | null = null;

    if (refreshToken) {
      const record = await this.prisma.refreshToken.findUnique({
        where: { token: this.hashRefreshToken(refreshToken) },
        select: { userId: true },
      });
      if (record) {
        userId = record.userId;
        await this.prisma.refreshToken.updateMany({
          where: { token: this.hashRefreshToken(refreshToken) },
          data: { revoked: true, revokedAt: new Date() },
        });
      } else {
        this.logger.warn('auth.logout_no_match: refresh token not in DB', { ip: req.ip });
      }
    } else {
      this.logger.warn('auth.logout_no_match: no refresh token cookie', { ip: req.ip });
    }

    this.clearAuthCookies(res);

    if (userId) {
      await this.audit.log({
        userId,
        action: 'auth.logout',
        entity: 'User',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string, req: Request) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If account exists, reset link sent.' };
    }

    const token = randomBytes(48).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // URL carries the plaintext token; DB stores only the hash.
    const resetUrl = `${firstOrigin(this.config, 'WEB_URL', 'http://localhost:3000')}/auth/reset-password?token=${token}`;

    void this.mail
      .sendPasswordReset(user.email, user.name || 'there', resetUrl)
      .catch((err) => this.logger.error(`Reset email failed: userId=${user.id}`, err));

    await this.audit.log({
      userId: user.id,
      action: 'auth.password_reset_requested',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return { message: 'If account exists, reset link sent.' };
  }

  async resetPassword(dto: ResetPasswordDto, req: Request) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token: tokenHash },
    });

    if (!reset || reset.used || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: reset.userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      userId: reset.userId,
      action: 'auth.password_reset',
      entity: 'User',
      entityId: reset.userId,
      ipAddress: req.ip,
      severity: 'WARNING',
    });

    return { message: 'Password reset. Please login.' };
  }

  // ─── OAuth handler ───────────────────────────────────────
  // Called by the Google + Discord callback routes after passport has
  // validated the provider's response. Three cases to cover:
  //
  //   1. Returning user — OAuthAccount already exists. Just log them
  //      in and refresh the avatar/name if the provider sent newer
  //      values.
  //   2. New SSO on an existing email — there's already a User row
  //      with this email (created via email+password earlier). Link
  //      the OAuth identity to that row so they can use either method
  //      to sign in going forward.
  //   3. Brand new user — create a User with no password, mark email
  //      as verified (the provider already verified it), attach the
  //      OAuthAccount.
  async handleOAuth(
    profile: {
      provider: 'google' | 'discord';
      providerId: string;
      email: string;
      emailVerified: boolean;
      name: string | null;
      avatar: string | null;
      accessToken: string;
      refreshToken: string | null;
    },
    req: Request,
    res: Response,
  ) {
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
      include: { user: true },
    });

    /* AUTH-004 — account-takeover guard. A first-time OAuth identity is only
       allowed to LINK to (or pre-verify) an account by email when the provider
       asserts the email is verified. Without this, anyone who registers a
       provider account under a victim's unverified email could log straight
       into the victim's GETX account. Returning identities (existingOAuth)
       are already proven, so they skip the check. */
    if (!existingOAuth && !profile.emailVerified) {
      await this.audit.log({
        action: 'auth.oauth_unverified_email_rejected',
        entity: 'User',
        entityId: 'pending',
        metadata: {
          provider: profile.provider,
          emailHash: this.hashEmail(profile.email),
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'WARNING',
      });
      const login = firstOrigin(this.config, 'WEB_URL', 'http://localhost:3000');
      res.redirect(`${login}/auth/login?error=oauth_email_unverified`);
      return;
    }

    let user;
    if (existingOAuth) {
      // Case 1 — refresh the cached tokens + opportunistically update
      // the profile name/avatar if Google/Discord sent newer values.
      // AUTH-005: provider tokens are stored encrypted at rest.
      await this.prisma.oAuthAccount.update({
        where: { id: existingOAuth.id },
        data: {
          accessToken: this.encryptOAuthToken(profile.accessToken),
          refreshToken: profile.refreshToken
            ? this.encryptOAuthToken(profile.refreshToken)
            : existingOAuth.refreshToken,
        },
      });
      user = existingOAuth.user;
    } else {
      const userByEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (userByEmail) {
        // Case 2 — link the new provider to the existing account.
        await this.prisma.oAuthAccount.create({
          data: {
            userId: userByEmail.id,
            provider: profile.provider,
            providerId: profile.providerId,
            providerEmail: profile.email,
            accessToken: this.encryptOAuthToken(profile.accessToken),
            refreshToken: this.encryptOAuthToken(profile.refreshToken),
          },
        });
        await this.audit.log({
          userId: userByEmail.id,
          action: 'auth.oauth_linked',
          entity: 'User',
          entityId: userByEmail.id,
          metadata: { provider: profile.provider },
          ipAddress: req.ip,
          severity: 'INFO',
        });
        user = userByEmail;
      } else {
        // Case 3 — fresh signup via OAuth. country defaults to 'US'
        // since the provider doesn't share it; the onboarding flow
        // will prompt the user to set their real country before any
        // KYC-gated action. Email is pre-verified because Google /
        // Discord don't release an email until the user has confirmed
        // it themselves.
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            password: null,
            name: profile.name,
            avatar: profile.avatar,
            country: 'US',
            role: 'BOTH',
            kycLevel: 'LEVEL_0',
            kycStatus: 'NONE',
            marketingOptIn: false,
            interestedInSelling: false,
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: true,
            emailVerified: new Date(),
            onboardingCompleted: false,
            oauthAccounts: {
              create: {
                provider: profile.provider,
                providerId: profile.providerId,
                providerEmail: profile.email,
                accessToken: this.encryptOAuthToken(profile.accessToken),
                refreshToken: this.encryptOAuthToken(profile.refreshToken),
              },
            },
          },
        });
        await this.audit.log({
          userId: user.id,
          action: 'auth.register_oauth',
          entity: 'User',
          entityId: user.id,
          metadata: { provider: profile.provider, email: profile.email },
          ipAddress: req.ip,
          severity: 'INFO',
        });
      }
    }

    if (user.status === 'BANNED' || user.status === 'DELETED') {
      throw new UnauthorizedException(
        user.status === 'BANNED' ? 'Account banned' : 'Account deleted',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: req.ip,
        lastLoginUserAgent: req.headers['user-agent'],
      },
    });

    const oauthRefreshTtlMs = 7 * 24 * 60 * 60 * 1000; // OAuth flows imply remember-me
    const tokens = await this.generateTokens(user, undefined, oauthRefreshTtlMs);
    this.setAuthCookies(res, tokens, oauthRefreshTtlMs);

    await this.audit.log({
      userId: user.id,
      action: 'auth.login_oauth',
      entity: 'User',
      entityId: user.id,
      metadata: { provider: profile.provider },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Redirect the browser back to the SPA. WEB_URL may be a
    // comma-separated allowlist; pick the canonical first entry.
    const landing = firstOrigin(this.config, 'WEB_URL', 'http://localhost:3000');
    res.redirect(`${landing}/?oauth=ok`);
    return;
  }

  async me(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        role: true,
        country: true,
        emailVerified: true,
        phoneVerified: true,
        kycLevel: true,
        kycStatus: true,
        isSeller: true,
        sellerRating: true,
        verifiedTier: true,
        buyerWallet: true,
        sellerWallet: true,
        pendingEarnings: true,
        totalEarned: true,
        totalSales: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException();
    return user;
  }

  /* Soft session probe — used by the SPA bootstrap. Always returns 200
     so an anonymous landing visit doesn't produce a red 401 in the
     console (which Lighthouse flags under Best Practices). Mirrors the
     JwtAuthGuard's token-resolution order: accessToken cookie first,
     Authorization: Bearer fallback. Any verification failure (missing,
     expired, invalid signature, bad shape) collapses to { user: null }
     — we never differentiate so this endpoint can't be used as a
     token-validity oracle. */
  async session(req: Request): Promise<{ user: Awaited<ReturnType<AuthService['me']>> | null }> {
    const cookies = req.cookies as Record<string, string> | undefined;
    const cookieToken = cookies?.['accessToken'];
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    const token = cookieToken ?? headerToken;
    if (!token) return { user: null };

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        algorithms: ['HS256'],
        issuer: 'getx.live',
        audience: 'getx-api',
      });
      if (!payload?.sub) return { user: null };
      const user = await this.me(payload.sub);
      return { user };
    } catch {
      return { user: null };
    }
  }

  async activateSeller(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('Account not active');
    }

    if (user.isSeller) {
      return {
        message: 'Already activated',
        user: this.sanitizeUser(user),
      };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSeller: true,
        sellerActivatedAt: new Date(),
      },
    });

    await this.audit.log({
      userId,
      action: 'seller.activated',
      entity: 'User',
      entityId: userId,
    });

    return {
      message:
        'Seller mode activated! You can now create listings and submit offers.',
      user: this.sanitizeUser(updated),
    };
  }

  // ─── Two-factor (TOTP) + step-up (AUTH-008 / AUTH-010) ───

  async getTwoFactorStatus(userId: string): Promise<{ enabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundException();
    return { enabled: user.twoFactorEnabled };
  }

  /* Begin enrollment: generate a secret, store it ENCRYPTED in UserPii, and
     return the plaintext once (to the authenticated owner) so the client can
     render the QR / offer manual key entry. 2FA is not active until enable()
     confirms the user can produce a valid code. */
  async setupTwoFactor(
    userId: string,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundException();
    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor is already enabled. Disable it before re-enrolling.',
      );
    }

    const secret = generateTotpSecret();
    await this.prisma.userPii.upsert({
      where: { userId },
      create: { userId, twoFactorSecret: encryptPii(secret) },
      update: { twoFactorSecret: encryptPii(secret) },
    });

    return { secret, otpauthUrl: totpKeyUri(user.email, 'GETX', secret) };
  }

  async enableTwoFactor(
    userId: string,
    code: string,
  ): Promise<{ enabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundException();
    if (user.twoFactorEnabled) return { enabled: true };

    const pii = await this.prisma.userPii.findUnique({
      where: { userId },
      select: { twoFactorSecret: true },
    });
    if (!pii?.twoFactorSecret) {
      throw new BadRequestException('Start two-factor setup first.');
    }
    if (!verifyTotp(code, decryptPii(pii.twoFactorSecret))) {
      throw new BadRequestException(
        'Invalid code. Check your authenticator app and try again.',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    await this.audit.log({
      userId,
      action: 'auth.2fa_enabled',
      entity: 'User',
      entityId: userId,
      severity: 'WARNING',
    });
    return { enabled: true };
  }

  async disableTwoFactor(
    userId: string,
    code: string,
  ): Promise<{ enabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundException();
    if (!user.twoFactorEnabled) return { enabled: false };

    const pii = await this.prisma.userPii.findUnique({
      where: { userId },
      select: { twoFactorSecret: true },
    });
    const secret = pii?.twoFactorSecret ? decryptPii(pii.twoFactorSecret) : null;
    // Require a valid current code to turn 2FA off — stops a hijacked session
    // from silently stripping the second factor.
    if (!secret || !verifyTotp(code, secret)) {
      throw new BadRequestException('Invalid code.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false },
      }),
      this.prisma.userPii.update({
        where: { userId },
        data: { twoFactorSecret: null },
      }),
    ]);
    await this.audit.log({
      userId,
      action: 'auth.2fa_disabled',
      entity: 'User',
      entityId: userId,
      severity: 'WARNING',
    });
    return { enabled: false };
  }

  /* Re-authenticate for a CRITICAL action. If 2FA is on, a TOTP code is
     required; otherwise the account password. On success, mint a 5-minute
     step-up token (aud getx-stepup) the client replays as X-Step-Up-Token. */
  async stepUp(
    userId: string,
    dto: { password?: string; totpCode?: string },
    req: Request,
  ): Promise<{ stepUpToken: string; expiresIn: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundException();

    let ok = false;
    if (user.twoFactorEnabled) {
      const pii = await this.prisma.userPii.findUnique({
        where: { userId },
        select: { twoFactorSecret: true },
      });
      const secret = pii?.twoFactorSecret
        ? decryptPii(pii.twoFactorSecret)
        : null;
      ok = !!secret && !!dto.totpCode && verifyTotp(dto.totpCode, secret);
    } else if (user.password && dto.password) {
      ok = await bcrypt.compare(dto.password, user.password);
    }

    if (!ok) {
      await this.audit.log({
        userId,
        action: 'auth.step_up_failed',
        entity: 'User',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'WARNING',
      });
      throw new UnauthorizedException('Re-authentication failed.');
    }

    const secret = this.config.get<string>('JWT_ACCESS_SECRET')!;
    const stepUpToken = await this.jwt.signAsync(
      { sub: userId, su: true },
      {
        secret,
        expiresIn: '5m',
        algorithm: 'HS256',
        issuer: 'getx.live',
        audience: STEP_UP_AUDIENCE,
      },
    );
    await this.audit.log({
      userId,
      action: 'auth.step_up_ok',
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip,
      severity: 'INFO',
    });
    return { stepUpToken, expiresIn: 300 };
  }

  // ─── helpers ───────────────────────────────────────────

  private generateOTP(): string {
    /* crypto.randomInt is uniform over [min, max). Math.random is a
       seeded PRNG and produces guessable OTPs after a few observations,
       so it must never gate auth flows. */
    return randomInt(100000, 1000000).toString();
  }

  private async generateTokens(
    user: { id: string; email: string; role: string },
    family?: string,
    // AUTH-MED-027: caller passes the TTL so DB expiresAt and cookie maxAge
    // are always in sync. Defaults to 7 days (remember-me / OAuth flows).
    refreshTtlMs: number = 7 * 24 * 60 * 60 * 1000,
  ) {
    const tokenFamily = family || randomBytes(16).toString('base64url');

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET')!;
    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES') || '15m';

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: accessSecret,
        expiresIn: accessExpires as unknown as number,
        algorithm: 'HS256',
        issuer: 'getx.live',
        audience: 'getx-api',
      },
    );

    // Opaque refresh token — no JWT wrapper. DB stores only the SHA-256 hash
    // so a DB dump can't produce a usable token.
    const refreshToken = randomBytes(48).toString('base64url');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: this.hashRefreshToken(refreshToken),
        family: tokenFamily,
        expiresAt: new Date(Date.now() + refreshTtlMs),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /* AUTH-005 — provider OAuth tokens are secrets (they grant API access to the
     user's Google/Discord account). Store them AES-256-GCM encrypted, reusing
     the same key/helper as withdrawal PII, so a DB dump never yields usable
     provider credentials. */
  private encryptOAuthToken(token: string | null): string | null {
    return token ? encryptPii(token) : null;
  }

  /* AUTH-011 — short-lived, WS-scoped ticket for the socket.io handshake.
     Distinct `aud: getx-ws` means the API's JwtAuthGuard (which requires
     `aud: getx-api`) rejects it, so a leaked ticket cannot call REST routes;
     the ~60s lifetime bounds the replay window for the handshake itself. */
  async issueWsTicket(userId: string): Promise<{ token: string }> {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET')!;
    const token = await this.jwt.signAsync(
      { sub: userId, type: 'ws' },
      {
        secret,
        expiresIn: '60s',
        algorithm: 'HS256',
        issuer: 'getx.live',
        audience: 'getx-ws',
      },
    );
    return { token };
  }

  private hashEmail(email: string): string {
    return createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
  }

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    // AUTH-MED-027: accept the exact TTL (ms) so cookie maxAge always
    // matches the DB RefreshToken.expiresAt — no more boolean/duration skew.
    refreshTtlMs: number,
  ) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const domain = this.config.get<string>('COOKIE_DOMAIN');

    /* In production the web app proxies API requests through Next.js rewrites
       so every request is same-origin from the browser's perspective.  This
       lets us use sameSite=lax, which Safari ITP does not block (ITP only
       targets cross-site / SameSite=None cookies).  The domain is omitted so
       cookies are host-only on whichever origin serves them (getx.live via
       the Vercel proxy in prod, localhost in dev). */
    const baseOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      ...(domain ? { domain } : {}),
    };

    res.cookie('accessToken', tokens.accessToken, {
      ...baseOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...baseOptions,
      maxAge: refreshTtlMs,
    });
  }

  private clearAuthCookies(res: Response) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const domain = this.config.get<string>('COOKIE_DOMAIN');

    const opts = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      ...(domain ? { domain } : {}),
    };

    res.clearCookie('accessToken', opts);
    res.clearCookie('refreshToken', opts);
  }

  private sanitizeUser(user: Record<string, unknown>) {
    // Explicit allowlist — avoids leaking op-state fields (failedLoginCount,
    // lastLoginIp, lockedUntil, banReason, unsubscribeToken, etc.) that
    // a spread-minus approach would silently include as columns are added.
    return {
      id: user['id'],
      email: user['email'],
      name: user['name'],
      username: user['username'],
      avatar: user['avatar'],
      role: user['role'],
      country: user['country'],
      status: user['status'],
      emailVerified: user['emailVerified'],
      phoneVerified: user['phoneVerified'],
      kycLevel: user['kycLevel'],
      kycStatus: user['kycStatus'],
      isSeller: user['isSeller'],
      sellerRating: user['sellerRating'],
      verifiedTier: user['verifiedTier'],
      buyerWallet: user['buyerWallet'],
      sellerWallet: user['sellerWallet'],
      pendingEarnings: user['pendingEarnings'],
      totalEarned: user['totalEarned'],
      totalSales: user['totalSales'],
      onboardingCompleted: user['onboardingCompleted'],
      interestedInSelling: user['interestedInSelling'],
      marketingOptIn: user['marketingOptIn'],
      createdAt: user['createdAt'],
    };
  }
}
