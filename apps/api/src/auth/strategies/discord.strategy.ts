import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-discord';
import type { OAuthProfileNormalized } from './google.strategy';

/* Discord OAuth 2.0 strategy — passport-discord wraps the standard
   /api/oauth2/authorize → /api/oauth2/token flow. We request the
   `identify` (basic profile + user ID) and `email` scopes; without
   `email` Discord returns a `verified=false` profile with no email
   and we can't create a User row.

   Discord's avatar URL is reconstructed from the user id + hash on
   the gateway CDN — passport-discord already gives us the hash in
   `profile.avatar`, so we build the URL inline. */
@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  private readonly logger = new Logger(DiscordStrategy.name);

  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('DISCORD_OAUTH_CLIENT_ID') ?? 'missing',
      clientSecret:
        config.get<string>('DISCORD_OAUTH_CLIENT_SECRET') ?? 'missing',
      callbackURL:
        config.get<string>('DISCORD_OAUTH_CALLBACK_URL') ??
        'http://localhost:4000/api/v1/auth/discord/callback',
      scope: ['identify', 'email'],
    });

    if (!config.get<string>('DISCORD_OAUTH_CLIENT_ID')) {
      new Logger('DiscordStrategy').warn(
        'DISCORD_OAUTH_CLIENT_ID missing — Discord sign-in will fail until secrets are set.',
      );
    }
  }

  validate(
    accessToken: string,
    refreshToken: string | undefined,
    profile: Profile,
    done: (err: Error | null, user?: OAuthProfileNormalized) => void,
  ): void {
    if (!profile.email) {
      this.logger.warn(
        `Discord OAuth profile ${profile.id} returned no email — rejecting`,
      );
      done(new Error('Discord profile did not include an email address'));
      return;
    }

    // Discord avatar CDN — animated avatars use .gif, static use .png.
    // Hashes starting with `a_` are animated.
    const avatar = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}${profile.avatar.startsWith('a_') ? '.gif' : '.png'}?size=256`
      : null;

    const normalized: OAuthProfileNormalized = {
      provider: 'discord',
      providerId: profile.id,
      email: profile.email.toLowerCase(),
      name:
        profile.global_name ||
        profile.username ||
        null,
      avatar,
      accessToken,
      refreshToken: refreshToken ?? null,
    };

    done(null, normalized);
  }
}
