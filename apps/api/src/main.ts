import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Versioned API prefix per TRD (/api/v1).
  app.setGlobalPrefix('api/v1');

  // TODO(Phase 2+): restrict CORS to the deployed Vercel origin(s) only.
  app.enableCors();

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
}

bootstrap();
