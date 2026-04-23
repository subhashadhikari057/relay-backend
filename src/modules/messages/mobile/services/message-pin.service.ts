import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import { MessageAccessService } from './message-access.service';
import { MessageEngagementService } from './message-engagement.service';
import { MessageQueryService } from './message-query.service';

@Injectable()
export class MessagePinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
    private readonly messageAccessService: MessageAccessService,
    private readonly messageEngagementService: MessageEngagementService,
    private readonly messageQueryService: MessageQueryService,
  ) {}

  private get client() {
    return this.prisma as PrismaClient;
  }

  async togglePin(input: {
    userId: string;
    workspaceId: string;
    channelId: string;
    messageId: string;
  }) {
    const channel = await this.messageAccessService.resolveChannelAccess(
      input.userId,
      input.workspaceId,
      input.channelId,
    );
    this.messageAccessService.assertCanWriteToChannel(channel);

    const message =
      await this.messageEngagementService.assertMessageExistsForToggle({
        messageId: input.messageId,
        workspaceId: input.workspaceId,
        channelId: input.channelId,
      });

    if (message.deletedAt) {
      throw new BadRequestException('Cannot pin a deleted message');
    }

    const existingPin = await this.client.messagePin.findUnique({
      where: {
        messageId: input.messageId,
      },
    });

    let action: 'pinned' | 'unpinned';
    if (existingPin) {
      await this.client.messagePin.delete({
        where: {
          messageId: input.messageId,
        },
      });
      action = 'unpinned';
    } else {
      await this.client.messagePin.create({
        data: {
          messageId: input.messageId,
          pinnedByUserId: input.userId,
        },
      });
      action = 'pinned';
    }

    const meta =
      await this.messageEngagementService.getReactionSummaryForMessage(
        input.messageId,
        input.userId,
      );

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId: input.workspaceId,
        actorUserId: input.userId,
        action: AuditAction.WORKSPACE_MESSAGE_PIN_TOGGLED,
        entityType: AuditEntityType.MESSAGE_PIN,
        entityId: input.messageId,
        metadata: {
          channelId: input.channelId,
          action,
        },
      }),
    );

    return {
      action,
      messageId: input.messageId,
      isPinned: meta.isPinned,
      pinnedAt: meta.pinnedAt,
      pinnedByUserId: meta.pinnedByUserId,
    };
  }

  listPinnedMessages(userId: string, workspaceId: string, channelId: string) {
    return this.messageQueryService.listPinnedMessages(
      userId,
      workspaceId,
      channelId,
    );
  }
}
