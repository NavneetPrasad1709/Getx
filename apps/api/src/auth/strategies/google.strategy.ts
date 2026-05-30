import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';

export type OAuthProfileNormalized = {
  provider: 'google' | 'discord';
  providerId: string;
  email: string;
  // AUTH-004: whether the PROVIDER asserts this email is verified. Only a
  // verified email may be auto-linked to / pre-verify an existing account,
  // otherwise an attacker who controls an unverified-email provider account
  // could take over a GETX account that shares that address.
  emailVerified: boolean;
  name: string | null;
  avatar: string | null;
  accessToken: string;
  refreshToken: string | null;
};

/* Google OAuth 2.0 strategy.

   Wires into the standard passport flow: GET /api/v1/auth/google
   triggers a redirect to Google's consent screen, and Google calls
   back at the configured callbackURL with an `?code=...` that
   passport-google-oauth20 exchanges for tokens. Our `validate()`
   reduces Google's profile shape to the normalized form the auth
   service expects.

   If the OAuth env vars are missing at boot (e.g. dev without OAuth
   secrets set), the strategy still registers but every callback will
   fail with a clear "OAuth not configured" error rather than a
   confusing 401 from Google. */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_OAUTH_CLIENT_ID') ?? 'missing',
      clientSecret:
        config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET') ?? 'missing',
      callbackURL:
        config.get<string>('GOOGLE_OAUTH_CALLBACK_URL') ??
        'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });

    if (!config.get<string>('GOOGLE_OAUTH_CLIENT_ID')) {
      // Surface this loudly at boot so the misconfig is obvious from
      // the very first log line instead of being discovered the first
      // time a user clicks the Google button in production.
      new Logger('GoogleStrategy').warn(
        'GOOGLE_OAUTH_CLIENT_ID missing — Google sign-in will fail until secrets are set.',
      );
    }
  }

  validate(
    accessToken: string,
    refreshToken: string | undefined,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    // Google guarantees emails[].value when scope includes "email" and
    // the account has a primary email — which is every account today.
    // Defensive guard anyway: a profile without an email can't be
    // mapped to a User row that has a unique email column.
    const email = profile.emails?.[0]?.value;
    if (!email) {
      this.logger.warn(
        `Google OAuth profile ${profile.id} returned no email — rejecting`,
      );
      done(new Error('Google profile did not include an email address'));
      return;
    }

    // Google asserts email verification via the id_token's `email_verified`
    // claim, surfaced on `_json`. Treat anything other than an explicit true
    // as unverified (fail closed).
    const emailVerified =
      (profile._json as { email_verified?: boolean } | undefined)
        ?.email_verified === true;

    const normalized: OAuthProfileNormalized = {
      provider: 'google',
      providerId: profile.id,
      email: email.toLowerCase(),
      emailVerified,
      name:
        profile.displayName ||
        [profile.name?.givenName, profile.name?.familyName]
          .filter(Boolean)
          .join(' ') ||
        null,
      avatar: profile.photos?.[0]?.value ?? null,
      accessToken,
      refreshToken: refreshToken ?? null,
    };

    done(null, normalized);
  }
}
