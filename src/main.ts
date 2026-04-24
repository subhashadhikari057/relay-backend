import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { setupApiDocs } from './config/swagger.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const frontendOrigins = configService.get<string[]>('frontend.origins') ?? [];
  const uploadRoot = configService.get<string>('upload.localRoot') ?? 'uploads';
  const normalizedUploadRoot = uploadRoot.replace(/^\/+|\/+$/g, '');
  const uploadAbsolutePath = path.resolve(process.cwd(), normalizedUploadRoot);

  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  });
  app.useStaticAssets(uploadAbsolutePath, {
    prefix: `/${normalizedUploadRoot}`,
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  const port = Number(process.env.PORT ?? 3000);
  setupApiDocs(app);

  logger.log(`Configured application port (from env): ${port}`);
  await app.listen(port);
  logger.log(`Application is listening on port: ${port}`);
  logger.log(`Admin API docs: http://localhost:${port}/api/api-docs`);
  logger.log(`Mobile API docs: http://localhost:${port}/api/mobile-docs`);
  logger.log(`Serving uploads from: /${normalizedUploadRoot}`);
}
void bootstrap();
