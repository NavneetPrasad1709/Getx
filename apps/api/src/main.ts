import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import type { Request } from 'express';
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
    const required = [
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'PII_ENCRYPTION_KEY',
      'WEB_URL',
      'SELLER_URL',
      'ADMIN_URL',
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      // Plain console.error — Logger isn't initialized yet at this point.

      console.error(
        `❌ Missing required env vars in production: ${missing.join(', ')}`,
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

  app.use(helmet());
  app.use(cookieParser());

  // Capture raw body for ALL routes — webhook handler needs it for signature
  // verification, others just don't read req.rawBody. Mounting json() with
  // a verify hook globally replaces Nest's default body parser cleanly.
  app.use(
    json({
      verify: (req, _res, buf) => {
        (req as RawBodyRequest).rawBody = Buffer.from(buf);
      },
    }),
  );

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
