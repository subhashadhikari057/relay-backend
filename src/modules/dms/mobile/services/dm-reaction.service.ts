import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ALLOWED_MESSAGE_REACTIONS } from 'src/modules/messages/mobile/constants/message-reactions.constant';
import { ToggleMessageReactionDto } from 'src/modules/messages/mobile/dto/toggle-message-reaction.dto';
import { MessageEngagementService } from 'src/modules/messages/mobile/services/message-engagement.service';
import { DmAccessService } from './dm-access.service';

@Injectable()
export class DmReactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dmAccessService: DmAccessService,
    private readonly messageEngagementService: MessageEngagementService,
  ) {}

  private get client() {
    return this.prisma as PrismaClient;
  }

  async toggleReaction(input: {
    userId: string;
    workspaceId: string;
    directConversationId: string;
    messageId: string;
    dto: ToggleMessageReactionDto;
  }) {
    await this.dmAccessService.resolveConversationAccess(
      input.userId,
      input.workspaceId,
      input.directConversationId,
    );

    const message =
      await this.messageEngagementService.assertMessageExistsForToggle({
        messageId: input.messageId,
        workspaceId: input.workspaceId,
        directConversationId: input.directConversationId,
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

    return {
      action,
      messageId: input.messageId,
      myReaction: meta.myReaction,
      reactionSummary: meta.reactionSummary,
    };
  }
}
