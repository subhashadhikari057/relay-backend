import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SessionNotificationService {
  private readonly logger = new Logger(SessionNotificationService.name);

  notifySessionEvicted(input: {
    userId: string;
    sessionId: string;
    reason: string;
  }) {
    this.logger.log(
      `Session eviction event queued (ws-placeholder): userId=${input.userId}, sessionId=${input.sessionId}, reason=${input.reason}`,
    );
  }
}
