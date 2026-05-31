import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ZodExceptionFilter } from './common/zod-exception.filter';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

async function bootstrap() {
  // Fail fast in production if a critical env var is missing — prevents the
  // localhost:3000 fallback from leaking into prod redirects, and surfaces
  // missing JWT secrets at boot instead of at first auth attempt.
  if (process.env.NODE_ENV === 'production') {
    /* COOKIE_DOMAIN is intentionally OPTIONAL. When unset, cookies fall
       back to host-only on the API origin — the correct behavior when
       the SPA and API live on unrelated registrable domains (e.g.
       api-*.up.railway.app vs *.vercel.app). Setting it to a Public
       Suffix List entry like ".vercel.app" makes browsers drop the
       cookie silently, so we prefer absent over wrong. */
    /* AUTH-007: JWT_REFRESH_SECRET is intentionally NOT required. Refresh
       tokens are opaque 48-byte random strings stored as SHA-256 hashes (see
       AuthService.generateTokens) — there is no refresh JWT to sign, so the
       secret was dead config. Only the access-token signing secret matters. */
    const required = [
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'PII_ENCRYPTION_KEY',
      'WEB_URL',
      'SELLER_URL',
      'ADMIN_URL',
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.error(
        `❌ Missing required env vars in production: ${missing.join(', ')}`,
      );
      process.exit(1);
    }

    // Enforce secret strength — a short JWT secret is trivially brute-forced.
    if ((process.env.JWT_ACCESS_SECRET?.length ?? 0) < 32) {
      console.error('❌ JWT_ACCESS_SECRET must be at least 32 characters');
      process.exit(1);
    }
    // PII key must be exactly 64 hex chars (32 bytes) — no scrypt fallback accepted.
    if (!/^[0-9a-f]{64}$/.test(process.env.PII_ENCRYPTION_KEY ?? '')) {
      console.error(
        '❌ PII_ENCRYPTION_KEY must be a 64-char lowercase hex string. Generate: openssl rand -hex 32',
      );
      process.exit(1);
    }
    /* FLOW-001: transactional email MUST work in production. Without
       RESEND_API_KEY the mail service silently degrades to console-logging the
       OTP, so verification/reset emails never arrive and users can never verify
       their email — which login now requires. Allow an explicit opt-out
       (DEV_EMAIL_CONSOLE=true) for staging smoke tests, but never by accident. */
    if (!process.env.RESEND_API_KEY && process.env.DEV_EMAIL_CONSOLE !== 'true') {
      console.error(
        '❌ RESEND_API_KEY is required in production — without it OTP/verification emails are never sent and users cannot log in. Set RESEND_API_KEY, or set DEV_EMAIL_CONSOLE=true to intentionally mock email.',
      );
      process.exit(1);
    }
    /* P5-T1: Redis coordinates rate limiting, cron leader-election, the
       Socket.IO adapter, and the auth cache ACROSS replicas. Running more than
       one replica without it causes duplicate cron money-effects and per-pod
       (ineffective) rate limits. Require it by default; allow an explicit
       single-replica opt-out. */
    if (!process.env.REDIS_URL && process.env.ALLOW_SINGLE_REPLICA !== 'true') {
      console.error(
        '❌ REDIS_URL is required in production for multi-replica coordination (throttler, cron leader-election, socket adapter, auth cache). Set REDIS_URL, or set ALLOW_SINGLE_REPLICA=true to intentionally run a single replica without it.',
      );
      process.exit(1);
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false,
  });
  const config = app.get(ConfigService);

  // SIGTERM/SIGINT clean-shutdown for Railway/Render rollouts.
  app.enableShutdownHooks();

  // Trust the platform reverse proxy so req.ip + secure cookies work.
  // Railway/Render/Vercel front the app with their own load balancer.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // 2-year HSTS + preload so the browser never sends plain-HTTP to this origin.
      hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
      // Prevent reset-password ?token= from leaking via Referer to embedded assets.
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.disable('x-powered-by');
  app.use(cookieParser());

  // Only capture rawBody for webhook routes (needed for signature verification).
  // Cap webhook bodies at 1mb, everything else at 100kb to reduce DoS factor.
  app.use((req: RawBodyRequest, _res: Response, next: NextFunction) => {
    const isWebhook = req.url?.startsWith('/api/v1/webhooks/') ?? false;
    json({
      limit: isWebhook ? '1mb' : '100kb',
      verify: isWebhook
        ? (r: RawBodyRequest, __: Response, buf: Buffer) => {
            r.rawBody = buf;
          }
        : undefined,
    })(req as Request, _res, next);
  });

  // AUTH-CRIT-002: Force CORS preflight on all state-changing requests by
  // requiring Content-Type: application/json. Plain form POSTs skip the
  // preflight and can be weaponised for CSRF against sameSite=lax cookies.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      const ct = (req.headers['content-type'] ?? '') as string;
      if (!ct.startsWith('application/json')) {
        res.status(415).json({
          statusCode: 415,
          error: 'Unsupported Media Type',
          message: 'Content-Type must be application/json',
        });
        return;
      }
    }
    next();
  });

  /* CORS allowlist supports comma-separated values per env var so a
     single Vercel project served on multiple domains (preview + custom
     apex + www subdomain) can all hit the API without redeploying the
     backend each time a new alias goes up. Empty entries are filtered
     to tolerate trailing commas. */
  const parseOrigins = (raw?: string) =>
    (raw ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  app.enableCors({
    origin: [
      ...parseOrigins(config.get<string>('WEB_URL') ?? 'http://localhost:3000'),
      ...parseOrigins(
        config.get<string>('SELLER_URL') ?? 'http://localhost:3001',
      ),
      ...parseOrigins(
        config.get<string>('ADMIN_URL') ?? 'http://localhost:3002',
      ),
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Validation handled per-route by Zod (RegisterSchema.parse, etc.) —
  // skipping the global class-validator ValidationPipe avoids that dep.
  // ZodError -> 400 with field-level issues (otherwise Nest treats it as 500).
  // AllExceptionsFilter is the catch-all that logs every 5xx as a single
  // structured-JSON line so Railway/Vercel log shippers can index it.
  // Order matters: NestJS iterates filters reverse-registration order,
  // so list the catch-all FIRST and the more specific ZodErrorFilter LAST.
  app.useGlobalFilters(new AllExceptionsFilter(), new ZodExceptionFilter());

  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? 4000);
  /* Bind to 0.0.0.0 so the platform edge (Railway, Render, Fly) can reach
     the container. Node's default `::` would normally work, but some
     container runtimes only forward IPv4, and the silent failure shows up
     as a healthcheck timeout that's hard to diagnose. */
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  Logger.log(
    `GETX API listening on http://${host}:${port}/api/v1`,
    'Bootstrap',
  );
}

void bootstrap();
