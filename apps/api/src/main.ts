import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ZodExceptionFilter } from './common/zod-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());

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
