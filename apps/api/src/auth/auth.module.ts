import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { DiscordStrategy } from './strategies/discord.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import {
  GoogleOAuthRedirectGuard,
  DiscordOAuthRedirectGuard,
  OAuthFailureRedirector,
} from './guards/oauth-redirect.guard';
import {
  GoogleOAuthStartGuard,
  DiscordOAuthStartGuard,
} from './oauth-state';
import { RolesGuard } from './guards/roles.guard';
import { OwnershipGuard } from './guards/ownership.guard';
import { StepUpGuard } from './guards/step-up.guard';
import { SanctionsCron } from './sanctions.cron';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          issuer: 'getx.live',
          audience: 'getx-api',
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES') || '15m') as unknown as number,
        },
      }),
    }),
    // ThrottlerModule is now registered globally in AppModule; no local copy needed.
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    OptionalJwtAuthGuard,
    GoogleStrategy,
    DiscordStrategy,
    GoogleOAuthRedirectGuard,
    DiscordOAuthRedirectGuard,
    GoogleOAuthStartGuard,
    DiscordOAuthStartGuard,
    OAuthFailureRedirector,
    SanctionsCron,
    // Order matters: throttler runs first to short-circuit before auth/role
    // checks; OwnershipGuard runs last (needs req.user) and is a no-op unless a
    // route is marked with @RequireOwnership (ARCH-009).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: OwnershipGuard },
    // No-op unless a route is marked @RequireStepUp (AUTH-008).
    { provide: APP_GUARD, useClass: StepUpGuard },
  ],
  exports: [AuthService, OptionalJwtAuthGuard],
})
export class AuthModule {}
