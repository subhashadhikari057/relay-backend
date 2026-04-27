import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailProvider, SendEmailInput } from '../email.types';

type ResendEmailRequest = {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
};

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(input: SendEmailInput): Promise<void> {
    const apiKey = this.configService.get<string>('email.resendApiKey');
    const from = this.configService.get<string>('email.from');

    if (!apiKey || !from) {
      this.logger.warn(
        'RESEND is not configured (missing RESEND_API_KEY or EMAIL_FROM). Falling back to console logging.',
      );
      this.logger.log(
        `Email (console) -> to=${input.to} subject="${input.subject}"\n${input.text}`,
      );
      return;
    }

    const body: ResendEmailRequest = {
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      this.logger.error(
        `Failed to send email via Resend: ${res.status} ${res.statusText} ${errText}`.trim(),
      );
      return;
    }
  }
}
