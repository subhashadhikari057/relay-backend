import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageEngagementService } from 'src/modules/messages/mobile/services/message-engagement.service';
import { MessagePresenterService } from 'src/modules/messages/mobile/services/message-presenter.service';
import { MessageValidationService } from 'src/modules/messages/mobile/services/message-validation.service';
import { SearchDirectMessagesQueryDto } from '../dto/search-direct-messages-query.dto';
import { DmAccessService } from './dm-access.service';

@Injectable()
export class DmSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dmAccessService: DmAccessService,
    private readonly messageValidationService: MessageValidationService,
    private readonly messagePresenterService: MessagePresenterService,
    private readonly messageEngagementService: MessageEngagementService,
  ) {}

  async searchMessages(
    userId: string,
    workspaceId: string,
    query: SearchDirectMessagesQueryDto,
  ) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        isActive: true,
      },
      select: { workspaceId: true },
    });

    if (!membership) {
      throw new NotFoundException('Workspace membership not found');
    }

    if (query.directConversationId) {
      await this.dmAccessService.resolveConversationAccess(
        userId,
        workspaceId,
        query.directConversationId,
      );
    }

    const limit = this.messageValidationService.normalizeLimit(query.limit);
    const cursor = query.cursor
      ? this.messageValidationService.decodeCursor(query.cursor)
      : null;
    const normalizedQuery = query.query.trim();

    if (normalizedQuery.length < 2) {
      throw new BadRequestException(
        'Search query must contain at least 2 non-space characters',
      );
    }

    const where: Prisma.MessageWhereInput = {
      workspaceId,
      channelId: null,
      directConversationId: query.directConversationId,
      deletedAt: null,
      content: {
        contains: normalizedQuery,
        mode: 'insensitive',
      },
      directConversation: {
        members: {
          some: {
            userId,
            leftAt: null,
          },
        },
      },
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              {
                createdAt: new Date(cursor.createdAt),
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    };

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        ...this.messagePresenterService.messageInclude(),
        directConversation: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    const hasNext = messages.length > limit;
    const pageItems = hasNext ? messages.slice(0, limit) : messages;
    const nextCursor = hasNext
      ? this.messageValidationService.encodeCursor(
          pageItems[pageItems.length - 1].createdAt,
          pageItems[pageItems.length - 1].id,
        )
      : undefined;
    const metaMap = await this.messageEngagementService.buildMetaMap(
      pageItems.map((message) => message.id),
      userId,
    );

    return {
      count: pageItems.length,
      nextCursor,
      messages: pageItems.map((message) => ({
        ...this.messagePresenterService.mapMessage(
          message,
          userId,
          metaMap.get(message.id),
        ),
        conversationTitle: message.directConversation?.title ?? null,
        matchPreview: this.buildMatchPreview(message.content, normalizedQuery),
      })),
    };
  }

  private buildMatchPreview(content: string | null, query: string) {
    if (!content) {
      return '';
    }

    const normalizedContent = content.trim();
    const lowerContent = normalizedContent.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);

    if (matchIndex === -1) {
      return normalizedContent.length > 120
        ? `${normalizedContent.slice(0, 117)}...`
        : normalizedContent;
    }

    const start = Math.max(0, matchIndex - 30);
    const end = Math.min(
      normalizedContent.length,
      matchIndex + query.length + 30,
    );
    const prefix = start > 0 ? '...' : '';
    const suffix = end < normalizedContent.length ? '...' : '';

    return `${prefix}${normalizedContent.slice(start, end)}${suffix}`;
  }
}
