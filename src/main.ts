import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { setupApiDocs } from './config/swagger.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  const port = Number(process.env.PORT ?? 3000);
  setupApiDocs(app);

  logger.log(`Configured application port (from env): ${port}`);
  await app.listen(port);
  logger.log(`Application is listening on port: ${port}`);
  logger.log(`Admin API docs: http://localhost:${port}/api/api-docs`);
  logger.log(`Mobile API docs: http://localhost:${port}/api/mobile-docs`);
}
void bootstrap();
