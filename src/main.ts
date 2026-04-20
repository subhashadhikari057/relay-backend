import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { setupApiDocs } from './config/swagger.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
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
  logger.log(
    `Admin Swagger JSON: http://localhost:${port}/api/api-docs/openapi`,
  );
  logger.log(`Mobile API docs: http://localhost:${port}/api/mobile-docs`);
  logger.log(
    `Mobile Swagger JSON: http://localhost:${port}/api/mobile-docs/openapi`,
  );
}
void bootstrap();
