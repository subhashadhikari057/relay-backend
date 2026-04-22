import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { ListThreadRepliesQueryDto } from '../dto/list-thread-replies-query.dto';
import { MessageAccessService } from './message-access.service';
import { MessageEngagementService } from './message-engagement.service';
import { MessagePresenterService } from './message-presenter.service';
import { MessageValidationService } from './message-validation.service';

@Injectable()
export class MessageQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageAccessService: MessageAccessService,
    private readonly messageValidationService: MessageValidationService,
    private readonly messagePresenterService: MessagePresenterService,
    private readonly messageEngagementService: MessageEngagementService,
  ) {}

  async listMessages(
    userId: string,
    workspaceId: string,
    channelId: string,
    query: ListMessagesQueryDto,
  ) {
    await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
      { forRead: true },
    );

    const limit = this.messageValidationService.normalizeLimit(query.limit);
    const cursor = query.cursor
      ? this.messageValidationService.decodeCursor(query.cursor)
      : null;

    const where: Prisma.MessageWhereInput = {
      workspaceId,
      channelId,
      parentMessageId: null,
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
      include: this.messagePresenterService.messageInclude(),
    });

    const hasNext = messages.length > limit;
    const pageItems = hasNext ? messages.slice(0, limit) : messages;
    const metaMap = await this.messageEngagementService.buildMetaMap(
      pageItems.map((message) => message.id),
      userId,
    );
    const nextCursor = hasNext
      ? this.messageValidationService.encodeCursor(
          pageItems[pageItems.length - 1].createdAt,
          pageItems[pageItems.length - 1].id,
        )
      : undefined;

    return {
      count: pageItems.length,
      nextCursor,
      messages: pageItems.map((message) =>
        this.messagePresenterService.mapMessage(
          message,
          userId,
          metaMap.get(message.id),
        ),
      ),
    };
  }

  async getMessageById(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
  ) {
    await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
      { forRead: true },
    );

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        channelId,
        parentMessageId: null,
      },
      include: this.messagePresenterService.messageInclude(),
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const meta =
      await this.messageEngagementService.getReactionSummaryForMessage(
        message.id,
        userId,
      );

    return this.messagePresenterService.mapMessage(message, userId, meta);
  }

  async listThreadReplies(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    query: ListThreadRepliesQueryDto,
  ) {
    await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
      { forRead: true },
    );

    const parentMessage = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        channelId,
        parentMessageId: null,
      },
      select: { id: true },
    });

    if (!parentMessage) {
      throw new NotFoundException('Parent message not found');
    }

    const limit = this.messageValidationService.normalizeLimit(query.limit);
    const cursor = query.cursor
      ? this.messageValidationService.decodeCursor(query.cursor)
      : null;

    const where: Prisma.MessageWhereInput = {
      workspaceId,
      channelId,
      parentMessageId: parentMessage.id,
      ...(cursor
        ? {
            OR: [
              { createdAt: { gt: new Date(cursor.createdAt) } },
              {
                createdAt: new Date(cursor.createdAt),
                id: { gt: cursor.id },
              },
            ],
          }
        : {}),
    };

    const replies = await this.prisma.message.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      include: this.messagePresenterService.messageInclude(),
    });

    const hasNext = replies.length > limit;
    const pageItems = hasNext ? replies.slice(0, limit) : replies;
    const metaMap = await this.messageEngagementService.buildMetaMap(
      pageItems.map((reply) => reply.id),
      userId,
    );
    const nextCursor = hasNext
      ? this.messageValidationService.encodeCursor(
          pageItems[pageItems.length - 1].createdAt,
          pageItems[pageItems.length - 1].id,
        )
      : undefined;

    return {
      count: pageItems.length,
      nextCursor,
      messages: pageItems.map((reply) =>
        this.messagePresenterService.mapMessage(
          reply,
          userId,
          metaMap.get(reply.id),
        ),
      ),
    };
  }

  async getThreadReplyById(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    replyId: string,
  ) {
    await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
      { forRead: true },
    );

    const reply = await this.prisma.message.findFirst({
      where: {
        id: replyId,
        workspaceId,
        channelId,
        parentMessageId: messageId,
      },
      include: this.messagePresenterService.messageInclude(),
    });

    if (!reply) {
      throw new NotFoundException('Thread reply not found');
    }

    const meta =
      await this.messageEngagementService.getReactionSummaryForMessage(
        reply.id,
        userId,
      );

    return this.messagePresenterService.mapMessage(reply, userId, meta);
  }

  async listPinnedMessages(
    userId: string,
    workspaceId: string,
    channelId: string,
  ) {
    await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
      { forRead: true },
    );

    const pinnedMessageIds =
      await this.messageEngagementService.getPinnedMessagesForChannel({
        workspaceId,
        channelId,
      });

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
        channelId,
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
