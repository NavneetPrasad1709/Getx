import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  GoogleOAuthRedirectGuard,
  DiscordOAuthRedirectGuard,
  OAuthFailureRedirector,
} from './guards/oauth-redirect.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterSchema } from './dto/register.dto';
import { LoginSchema } from './dto/login.dto';
import { VerifyEmailSchema } from './dto/verify-email.dto';
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from './dto/reset-password.dto';
import type { OAuthProfileNormalized } from './strategies/google.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private oauthRedirect: OAuthFailureRedirector,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: unknown, @Req() req: Request) {
    const dto = RegisterSchema.parse(body);
    return this.auth.register(dto, req);
  }

  @Public()
  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: unknown, @Req() req: Request) {
    const dto = VerifyEmailSchema.parse(body);
    return this.auth.verifyEmail(dto, req);
  }

  @Public()
  @Post('resend-otp')
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() body: unknown, @Req() req: Request) {
    const { email } = z.object({ email: z.string().email() }).parse(body);
    return this.auth.resendOtp(email.toLowerCase(), req);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const dto = LoginSchema.parse(body);
    return this.auth.login(dto, req, res);
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.refreshToken;
    return this.auth.refresh(refreshToken, req, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.refreshToken;
    return this.auth.logout(userId, refreshToken, req, res);
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: unknown, @Req() req: Request) {
    const dto = ForgotPasswordSchema.parse(body);
    return this.auth.forgotPassword(dto.email, req);
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: unknown, @Req() req: Request) {
    const dto = ResetPasswordSchema.parse(body);
    return this.auth.resetPassword(dto, req);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }

  /* Public bootstrap probe — same payload as /auth/me on success, but
     returns 200 { user: null } for unauthenticated visitors instead of
     401. Lets the SPA root layout call this on every cold load (logged
     in or not) without filling the browser devtools / Lighthouse "Best
     Practices" report with red-flag 401 console errors. /auth/me stays
     strict for downstream calls that should fail closed. */
  @Public()
  @Get('session')
  @HttpCode(HttpStatus.OK)
  async session(@Req() req: Request) {
    return this.auth.session(req);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/activate-seller')
  async activateSeller(@CurrentUser('id') userId: string) {
    return this.auth.activateSeller(userId);
  }

  // ─── OAuth (Google / Discord) ──────────────────────────────────────
  // Each provider has TWO routes: GET /:provider kicks off the redirect
  // to the provider's consent screen, GET /:provider/callback is what
  // the provider calls back to with `?code=...`. passport-{google,
  // discord}-oauth20 handles the token exchange inside AuthGuard, and
  // `req.user` ends up populated with the OAuthProfileNormalized that
  // the strategy's validate() returned. We then either link the
  // identity to an existing User row (same email) or create a fresh
  // password-less account, set the same session cookies the email
  // login flow sets, and redirect the browser back to the SPA.

  // Throttle the OAuth start routes so a bot can't burn through
  // Google/Discord redirect budgets or fill our token-exchange queue
  // with garbage callbacks. 20/min/IP is generous for a real human
  // who clicks "Sign in with Google" once.
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async googleStart() {
    // AuthGuard('google') handles the redirect — handler body is never
    // executed.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthRedirectGuard)
  async googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = req.user as OAuthProfileNormalized & { oauthError?: string };
    if (profile?.oauthError) {
      this.oauthRedirect.redirect(res, profile.oauthError);
      return;
    }
    return this.auth.handleOAuth(profile, req, res);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async discordStart() {
    // see googleStart
  }

  @Public()
  @Get('discord/callback')
  @UseGuards(DiscordOAuthRedirectGuard)
  async discordCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = req.user as OAuthProfileNormalized & { oauthError?: string };
    if (profile?.oauthError) {
      this.oauthRedirect.redirect(res, profile.oauthError);
      return;
    }
    return this.auth.handleOAuth(profile, req, res);
  }
}
