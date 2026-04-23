import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import { ToggleMessageReactionDto } from '../dto/toggle-message-reaction.dto';
import { ALLOWED_MESSAGE_REACTIONS } from '../constants/message-reactions.constant';
import { MessageAccessService } from './message-access.service';
import { MessageEngagementService } from './message-engagement.service';

@Injectable()
export class MessageReactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
    private readonly messageAccessService: MessageAccessService,
    private readonly messageEngagementService: MessageEngagementService,
  ) {}

  private get client() {
    return this.prisma as PrismaClient;
  }

  async toggleReaction(input: {
    userId: string;
    workspaceId: string;
    channelId: string;
    messageId: string;
    dto: ToggleMessageReactionDto;
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
      throw new BadRequestException('Cannot react to deleted message');
    }

    const allowedReactions = new Set<string>(ALLOWED_MESSAGE_REACTIONS);
    if (!allowedReactions.has(input.dto.emoji)) {
      throw new BadRequestException('Unsupported reaction emoji');
    }

    const existingReaction = await this.client.messageReaction.findUnique({
      where: {
        messageId_userId: {
          messageId: input.messageId,
          userId: input.userId,
        },
      },
    });

    let action: 'added' | 'removed' | 'replaced';

    if (!existingReaction) {
      await this.client.messageReaction.create({
        data: {
          messageId: input.messageId,
          userId: input.userId,
          emoji: input.dto.emoji,
        },
      });
      action = 'added';
    } else if (existingReaction.emoji === input.dto.emoji) {
      await this.client.messageReaction.delete({
        where: {
          messageId_userId: {
            messageId: input.messageId,
            userId: input.userId,
          },
        },
      });
      action = 'removed';
    } else {
      await this.client.messageReaction.update({
        where: {
          messageId_userId: {
            messageId: input.messageId,
            userId: input.userId,
          },
        },
        data: {
          emoji: input.dto.emoji,
        },
      });
      action = 'replaced';
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
        action: AuditAction.WORKSPACE_MESSAGE_REACTION_TOGGLED,
        entityType: AuditEntityType.MESSAGE_REACTION,
        entityId: input.messageId,
        metadata: {
          channelId: input.channelId,
          action,
          emoji: input.dto.emoji,
          myReaction: meta.myReaction,
        },
      }),
    );

    return {
      action,
      messageId: input.messageId,
      myReaction: meta.myReaction,
      reactionSummary: meta.reactionSummary,
    };
  }
}
