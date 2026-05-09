import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
    private audit: AuditService,
  ) {}

  async register(dto: RegisterDto, req: Request) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

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
      metadata: { country: dto.country },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'INFO',
    });

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
      where: { token: refreshToken },
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
        where: { token: refreshToken, userId },
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

    const resetUrl = `${this.config.get<string>('WEB_URL')}/auth/reset-password?token=${token}`;

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
        onboardingCompleted: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException();
    return user;
  }

  // ─── helpers ───────────────────────────────────────────

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
        token: refreshToken,
        family: tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    rememberMe: boolean,
  ) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const domain = this.config.get<string>('COOKIE_DOMAIN');

    const baseOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
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
    const domain = this.config.get<string>('COOKIE_DOMAIN');
    const opts = domain ? { domain } : {};
    res.clearCookie('accessToken', opts);
    res.clearCookie('refreshToken', opts);
  }

  private sanitizeUser<T extends Record<string, unknown>>(user: T) {
    const { password, twoFactorSecret, aadhaarHash, panHash, ...safe } =
      user as Record<string, unknown>;
    return safe;
  }
}
