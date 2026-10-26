import 'reflect-metadata';
import './load-env.js';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { ensureDatabaseSchema } from './database-migration.js';

async function bootstrap() {
  ensureDatabaseSchema();

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: (process.env.CORS_ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      credentials: true,
    },
  });

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`TakeAwayList backend running on http://localhost:${port}`);
}

void bootstrap();
