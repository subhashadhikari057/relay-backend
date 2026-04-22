import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  sendEmailVerification(input: {
    email: string;
    fullName: string;
    verificationUrl: string;
  }) {
    const maskedEmail = this.maskEmail(input.email);
    const urlHost = this.getUrlHost(input.verificationUrl);
    this.logger.log(
      `Email verification queued for ${maskedEmail} (${input.fullName}) via ${urlHost}`,
    );
  }

  private maskEmail(email: string) {
    const [local, domain] = email.split('@');
    if (!local || !domain) {
      return 'hidden';
    }

    const prefix = local.slice(0, 2);
    return `${prefix}***@${domain}`;
  }

  private getUrlHost(url: string) {
    try {
      return new URL(url).host;
    } catch {
      return 'unknown-host';
    }
  }
}
