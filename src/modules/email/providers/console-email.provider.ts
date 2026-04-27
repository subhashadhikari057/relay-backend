import { Injectable, Logger } from '@nestjs/common';
import type { EmailProvider, SendEmailInput } from '../email.types';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async send(input: SendEmailInput): Promise<void> {
    this.logger.log(
      `Email (console) -> to=${input.to} subject="${input.subject}"\n${input.text}`,
    );
  }
}
