import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { DiscordStrategy } from './strategies/discord.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  GoogleOAuthRedirectGuard,
  DiscordOAuthRedirectGuard,
  OAuthFailureRedirector,
} from './guards/oauth-redirect.guard';
import { RolesGuard } from './guards/roles.guard';
import { SanctionsCron } from './sanctions.cron';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // expiresIn accepts strings like '15m' at runtime; the type union
          // requires a templated literal we satisfy via runtime cast.
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES') ||
            '15m') as unknown as number,
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    DiscordStrategy,
    GoogleOAuthRedirectGuard,
    DiscordOAuthRedirectGuard,
    OAuthFailureRedirector,
    SanctionsCron,
    // Order matters: throttler runs first to short-circuit before auth/role checks.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
