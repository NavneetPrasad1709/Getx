import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterSchema } from './dto/register.dto';
import { LoginSchema } from './dto/login.dto';
import { VerifyEmailSchema } from './dto/verify-email.dto';
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

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
}
