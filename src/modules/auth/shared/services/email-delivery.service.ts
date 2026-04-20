import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  sendEmailVerification(input: {
    email: string;
    fullName: string;
    verificationUrl: string;
  }) {
    this.logger.log(
      `Email verification link for ${input.email} (${input.fullName}): ${input.verificationUrl}`,
    );
  }
}
