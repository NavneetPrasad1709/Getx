import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import type { Request } from 'express';
import { AppModule } from './app.module';
import { ZodExceptionFilter } from './common/zod-exception.filter';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

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

  app.enableCors({
    origin: [
      config.get<string>('WEB_URL') || 'http://localhost:3000',
      config.get<string>('SELLER_URL') || 'http://localhost:3001',
      config.get<string>('ADMIN_URL') || 'http://localhost:3002',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Validation handled per-route by Zod (RegisterSchema.parse, etc.) —
  // skipping the global class-validator ValidationPipe avoids that dep.
  // ZodError -> 400 with field-level issues (otherwise Nest treats it as 500).
  app.useGlobalFilters(new ZodExceptionFilter());

  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  Logger.log(
    `GETX API listening on http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
}

void bootstrap();
