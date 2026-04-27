import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { ResendEmailProvider } from './providers/resend-email.provider';

@Module({
  providers: [EmailService, ConsoleEmailProvider, ResendEmailProvider],
  exports: [EmailService],
})
export class EmailModule {}
