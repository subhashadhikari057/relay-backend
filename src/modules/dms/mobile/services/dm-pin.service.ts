import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageEngagementService } from 'src/modules/messages/mobile/services/message-engagement.service';
import { MessagePresenterService } from 'src/modules/messages/mobile/services/message-presenter.service';
import { DmAccessService } from './dm-access.service';

@Injectable()
export class DmPinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dmAccessService: DmAccessService,
    private readonly messageEngagementService: MessageEngagementService,
    private readonly messagePresenterService: MessagePresenterService,
  ) {}

  private get client() {
    return this.prisma as PrismaClient;
  }

  async togglePin(input: {
    userId: string;
    workspaceId: string;
    directConversationId: string;
    messageId: string;
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

    return {
      action,
      messageId: input.messageId,
      isPinned: meta.isPinned,
      pinnedAt: meta.pinnedAt,
      pinnedByUserId: meta.pinnedByUserId,
    };
  }

  async listPinnedMessages(
    userId: string,
    workspaceId: string,
    directConversationId: string,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const pinnedMessageIds =
      await this.messageEngagementService.getPinnedMessagesForDirectConversation(
        {
          workspaceId,
          directConversationId,
        },
      );

    if (pinnedMessageIds.length === 0) {
      return {
        count: 0,
        messages: [],
      };
    }

    const orderMap = new Map(
      pinnedMessageIds.map((messageId, index) => [messageId, index]),
    );

    const messages = await this.prisma.message.findMany({
      where: {
        id: { in: pinnedMessageIds },
        workspaceId,
        directConversationId,
      },
      include: this.messagePresenterService.messageInclude(),
    });

    messages.sort((left, right) => {
      const leftOrder = orderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });

    const metaMap = await this.messageEngagementService.buildMetaMap(
      messages.map((message) => message.id),
      userId,
    );

    return {
      count: messages.length,
      messages: messages.map((message) =>
        this.messagePresenterService.mapMessage(
          message,
          userId,
          metaMap.get(message.id),
        ),
      ),
    };
  }
}
