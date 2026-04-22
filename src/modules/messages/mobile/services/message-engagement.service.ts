import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type MessageEngagementMeta = {
  reactionSummary: Array<{
    emoji: string;
    count: number;
  }>;
  myReaction: string | null;
  isPinned: boolean;
  pinnedAt: Date | null;
  pinnedByUserId: string | null;
};

@Injectable()
export class MessageEngagementService {
  constructor(private readonly prisma: PrismaService) {}

  private get client() {
    return this.prisma as PrismaClient;
  }

  async buildMetaMap(messageIds: string[], viewerUserId: string) {
    if (messageIds.length === 0) {
      return new Map<string, MessageEngagementMeta>();
    }

    const [reactionCounts, myReactions, pins] = await Promise.all([
      this.client.messageReaction.groupBy({
        by: ['messageId', 'emoji'],
        where: {
          messageId: { in: messageIds },
        },
        _count: {
          _all: true,
        },
      }),
      this.client.messageReaction.findMany({
        where: {
          userId: viewerUserId,
          messageId: { in: messageIds },
        },
        select: {
          messageId: true,
          emoji: true,
        },
      }),
      this.client.messagePin.findMany({
        where: {
          messageId: { in: messageIds },
        },
        select: {
          messageId: true,
          createdAt: true,
          pinnedByUserId: true,
        },
      }),
    ]);

    const map = new Map<string, MessageEngagementMeta>();

    for (const messageId of messageIds) {
      map.set(messageId, {
        reactionSummary: [],
        myReaction: null,
        isPinned: false,
        pinnedAt: null,
        pinnedByUserId: null,
      });
    }

    for (const row of reactionCounts) {
      const existing = map.get(row.messageId);
      if (!existing) {
        continue;
      }
      existing.reactionSummary.push({
        emoji: row.emoji,
        count: row._count._all,
      });
    }

    for (const row of myReactions) {
      const existing = map.get(row.messageId);
      if (!existing) {
        continue;
      }
      existing.myReaction = row.emoji;
    }

    for (const row of pins) {
      const existing = map.get(row.messageId);
      if (!existing) {
        continue;
      }
      existing.isPinned = true;
      existing.pinnedAt = row.createdAt;
      existing.pinnedByUserId = row.pinnedByUserId;
    }

    for (const value of map.values()) {
      value.reactionSummary.sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.emoji.localeCompare(right.emoji);
      });
    }

    return map;
  }

  async getReactionSummaryForMessage(messageId: string, viewerUserId: string) {
    const map = await this.buildMetaMap([messageId], viewerUserId);
    return (
      map.get(messageId) ?? {
        reactionSummary: [],
        myReaction: null,
        isPinned: false,
        pinnedAt: null,
        pinnedByUserId: null,
      }
    );
  }

  async getPinnedMessagesForChannel(input: {
    workspaceId: string;
    channelId: string;
  }) {
    const pinnedMessages = await this.client.messagePin.findMany({
      where: {
        message: {
          workspaceId: input.workspaceId,
          channelId: input.channelId,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { messageId: 'desc' }],
      select: {
        messageId: true,
      },
    });

    return pinnedMessages.map((item) => item.messageId);
  }

  async assertMessageExistsForToggle(input: {
    messageId: string;
    workspaceId: string;
    channelId: string;
  }) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: input.messageId,
        workspaceId: input.workspaceId,
        channelId: input.channelId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }
}
