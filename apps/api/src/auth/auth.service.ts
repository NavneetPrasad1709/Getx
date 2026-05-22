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
import { createHash, randomBytes, randomInt } from 'crypto';
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
        metadata: { country: dto.country, email: dto.email },
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
          email: dto.email,
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
        metadata: { email: dto.email, country: dto.country },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'WARNING',
      });
      return {
        message:
          'Registration successful. Check your email for verification code.',
        userId: existing.id,
        email: dto.email,
      };
    }

    /* Name-watchlist soft flag — does NOT block; just flags for manual
       review in the admin queue. Most hits are false-positives so we
       let the row land in PENDING_REVIEW for an admin to clear. */
    const flagForReview = shouldFlagName(dto.name);

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const otp = this.generateOTP();
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
      });

      await tx.emailVerification.create({
        data: {
          userId: newUser.id,
          email: newUser.email,
          otp,
          expiresAt: otpExpiresAt,
        },
      });

      return newUser;
    });

    // Fire-and-forget OTP send so signup response stays fast.
    void this.mail
      .sendVerificationOtp(user.email, user.name || 'there', otp)
      .catch((err) => console.error('Email send failed:', err));

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

    if (!verification) {
      throw new BadRequestException('No active verification found');
    }
    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired. Request a new one.');
    }
    if (verification.attempts >= 5) {
      throw new BadRequestException(
        'Too many failed attempts. Request a new OTP.',
      );
    }

    if (verification.otp !== dto.otp) {
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

      throw new BadRequestException('Invalid OTP');
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
      .catch((err) => console.error('Welcome email failed:', err));

    return { message: 'Email verified successfully', success: true };
  }

  async resendOtp(email: string, req: Request) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Generic response to avoid user enumeration.
      return { message: 'If account exists, OTP sent.' };
    }
    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const lastSent = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (lastSent && Date.now() - lastSent.createdAt.getTime() < 60 * 1000) {
      throw new BadRequestException(
        'Please wait 60 seconds before requesting again',
      );
    }

    const otp = this.generateOTP();
    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    void this.mail
      .sendVerificationOtp(user.email, user.name || 'there', otp)
      .catch((err) => console.error('OTP resend failed:', err));

    await this.audit.log({
      userId: user.id,
      action: 'auth.otp_resent',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return { message: 'OTP sent successfully' };
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

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account locked until ${user.lockedUntil.toLocaleTimeString()}. Try later.`,
      );
    }

    // OAuth-only accounts have no password — surface a hint instead of
    // letting bcrypt.compare crash on a null hash.
    if (!user.password) {
      throw new UnauthorizedException(
        'This account was created with Google or Discord. Use the SSO button to sign in.',
      );
    }

    const isValid = await bcrypt.compare(dto.password, user.password);

    if (!isValid) {
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

      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }
    if (user.status === 'BANNED')
      throw new UnauthorizedException('Account banned');
    if (user.status === 'DELETED')
      throw new UnauthorizedException('Account deleted');
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException(
        user.suspendedUntil
          ? `Account suspended until ${user.suspendedUntil.toLocaleDateString()}`
          : 'Account suspended',
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

    const tokens = await this.generateTokens(user);
    this.setAuthCookies(res, tokens, dto.rememberMe ?? false);

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

    const tokens = await this.generateTokens(
      tokenRecord.user,
      tokenRecord.family,
    );
    this.setAuthCookies(res, tokens, true);

    return { tokens };
  }

  async logout(
    userId: string,
    refreshToken: string | undefined,
    req: Request,
    res: Response,
  ) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: this.hashRefreshToken(refreshToken), userId },
        data: { revoked: true, revokedAt: new Date() },
      });
    }

    this.clearAuthCookies(res);

    await this.audit.log({
      userId,
      action: 'auth.logout',
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string, req: Request) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If account exists, reset link sent.' };
    }

    const token = randomBytes(48).toString('base64url');
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const resetUrl = `${firstOrigin(this.config, 'WEB_URL', 'http://localhost:3000')}/auth/reset-password?token=${token}`;

    void this.mail
      .sendPasswordReset(user.email, user.name || 'there', resetUrl)
      .catch((err) => console.error('Reset email failed:', err));

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
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
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

    let user;
    if (existingOAuth) {
      // Case 1 — refresh the cached tokens + opportunistically update
      // the profile name/avatar if Google/Discord sent newer values.
      await this.prisma.oAuthAccount.update({
        where: { id: existingOAuth.id },
        data: {
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken ?? existingOAuth.refreshToken,
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
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
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
                accessToken: profile.accessToken,
                refreshToken: profile.refreshToken,
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

    const tokens = await this.generateTokens(user);
    // OAuth flows imply "remember me" — the user explicitly chose to
    // sign in via a connected account, so issue a 7-day refresh token.
    this.setAuthCookies(res, tokens, true);

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

  async me(userId: string) {
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
  ) {
    const tokenFamily = family || randomBytes(16).toString('base64url');

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET')!;
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET')!;
    const accessExpires =
      this.config.get<string>('JWT_ACCESS_EXPIRES') || '15m';
    const refreshExpires =
      this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d';

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { secret: accessSecret, expiresIn: accessExpires as unknown as number },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, family: tokenFamily },
      { secret: refreshSecret, expiresIn: refreshExpires as unknown as number },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        // Stored as SHA-256 hex so a DB read alone can't surrender a
        // usable refresh JWT. The unique constraint still applies (hash
        // of an HMAC-signed JWT is collision-resistant in practice).
        token: this.hashRefreshToken(refreshToken),
        family: tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    rememberMe: boolean,
  ) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const domain = this.config.get<string>('COOKIE_DOMAIN');

    /* sameSite=none is required when the API and the SPA live on different
       registrable domains (api-production-XXXX.up.railway.app vs.
       getx-web.vercel.app) — Lax wouldn't be sent on the cross-site fetch
       at all. None requires Secure, which we already set in prod. Local dev
       sticks with Lax over http://localhost so browsers don't reject the
       cookie outright. */
    const baseOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      ...(domain ? { domain } : {}),
    };

    res.cookie('accessToken', tokens.accessToken, {
      ...baseOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...baseOptions,
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(res: Response) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const domain = this.config.get<string>('COOKIE_DOMAIN');

    /* Must match the attributes the cookie was set with — browsers only
       delete a cookie when (name + domain + path + sameSite/secure scope)
       all match the originating Set-Cookie. */
    const opts = {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
      ...(domain ? { domain } : {}),
    };

    res.clearCookie('accessToken', opts);
    res.clearCookie('refreshToken', opts);
  }

  private sanitizeUser<T extends Record<string, unknown>>(user: T) {
    const { password, twoFactorSecret, aadhaarHash, panHash, ...safe } =
      user as Record<string, unknown>;
    return safe;
  }
}
