import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  logger.log(`Configured application port (from env): ${port}`);
  await app.listen(port);
  logger.log(`Application is listening on port: ${port}`);
}
void bootstrap();
