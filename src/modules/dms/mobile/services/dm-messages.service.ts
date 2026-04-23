import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from 'src/modules/messages/mobile/dto/create-message.dto';
import { UpdateMessageDto } from 'src/modules/messages/mobile/dto/update-message.dto';
import { ListDirectMessagesQueryDto } from '../dto/list-direct-messages-query.dto';
import { ListDirectThreadRepliesQueryDto } from '../dto/list-direct-thread-replies-query.dto';
import { DmAccessService } from './dm-access.service';
import { MessageEngagementService } from 'src/modules/messages/mobile/services/message-engagement.service';
import { MessagePresenterService } from 'src/modules/messages/mobile/services/message-presenter.service';
import { MessageValidationService } from 'src/modules/messages/mobile/services/message-validation.service';

@Injectable()
export class DmMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dmAccessService: DmAccessService,
    private readonly messageValidationService: MessageValidationService,
    private readonly messagePresenterService: MessagePresenterService,
    private readonly messageEngagementService: MessageEngagementService,
  ) {}

  createMessage(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    dto: CreateMessageDto,
  ) {
    return this.createMessageRecord({
      userId,
      workspaceId,
      directConversationId,
      dto,
    });
  }

  async listMessages(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    query: ListDirectMessagesQueryDto,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const limit = this.messageValidationService.normalizeLimit(query.limit);
    const cursor = query.cursor
      ? this.messageValidationService.decodeCursor(query.cursor)
      : null;

    const messages = await this.prisma.message.findMany({
      where: {
        workspaceId,
        directConversationId,
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
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: this.messagePresenterService.messageInclude(),
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
    directConversationId: string,
    messageId: string,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        directConversationId,
        parentMessageId: null,
      },
      include: this.messagePresenterService.messageInclude(),
    });

    if (!message) {
      throw new NotFoundException('DM message not found');
    }

    const meta =
      await this.messageEngagementService.getReactionSummaryForMessage(
        message.id,
        userId,
      );

    return this.messagePresenterService.mapMessage(message, userId, meta);
  }

  async updateMessage(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        directConversationId,
        parentMessageId: null,
      },
      include: this.messagePresenterService.messageInclude(),
    });

    if (!message) {
      throw new NotFoundException('DM message not found');
    }

    if (message.type === 'system') {
      throw new BadRequestException('System messages cannot be edited');
    }

    this.dmAccessService.assertCanMutateMessage(
      userId,
      message.senderUserId,
      message.createdAt,
    );

    if (message.deletedAt) {
      throw new BadRequestException('Cannot edit deleted message');
    }

    const nextContent =
      dto.content !== undefined ? dto.content.trim() : undefined;
    if (dto.content !== undefined && (nextContent?.length ?? 0) === 0) {
      throw new BadRequestException('Message content cannot be empty');
    }

    await this.messageValidationService.validateDmMentionMetadata({
      metadata: dto.metadata,
      workspaceId,
      directConversationId,
    });

    const updated = await this.prisma.message.update({
      where: { id: message.id },
      data: {
        ...(nextContent !== undefined ? { content: nextContent } : {}),
        ...(dto.metadata !== undefined
          ? { metadata: dto.metadata as Prisma.InputJsonValue }
          : {}),
        editedAt: new Date(),
      },
      include: this.messagePresenterService.messageInclude(),
    });

    return this.mapMessageWithEngagement(updated, userId);
  }

  async deleteMessage(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    messageId: string,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        directConversationId,
        parentMessageId: null,
      },
      select: {
        id: true,
        type: true,
        senderUserId: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    if (!message) {
      throw new NotFoundException('DM message not found');
    }

    if (message.type === 'system') {
      throw new BadRequestException('System messages cannot be deleted');
    }

    this.dmAccessService.assertCanMutateMessage(
      userId,
      message.senderUserId,
      message.createdAt,
    );

    if (!message.deletedAt) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          content: null,
          metadata: Prisma.JsonNull,
          deletedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      messageId: message.id,
    };
  }

  async createThreadReply(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    messageId: string,
    dto: CreateMessageDto,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const parentMessage = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        directConversationId,
      },
      select: {
        id: true,
        parentMessageId: true,
        deletedAt: true,
      },
    });

    if (!parentMessage) {
      throw new NotFoundException('Parent message not found');
    }

    if (parentMessage.parentMessageId) {
      throw new BadRequestException('Reply-to-reply is not allowed');
    }

    if (parentMessage.deletedAt) {
      throw new BadRequestException('Cannot reply to deleted message');
    }

    return this.createMessageRecord({
      userId,
      workspaceId,
      directConversationId,
      dto,
      parentMessageId: parentMessage.id,
    });
  }

  async listThreadReplies(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    messageId: string,
    query: ListDirectThreadRepliesQueryDto,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const parentMessage = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        directConversationId,
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

    const replies = await this.prisma.message.findMany({
      where: {
        workspaceId,
        directConversationId,
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
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      include: this.messagePresenterService.messageInclude(),
    });

    const hasNext = replies.length > limit;
    const pageItems = hasNext ? replies.slice(0, limit) : replies;
    const nextCursor = hasNext
      ? this.messageValidationService.encodeCursor(
          pageItems[pageItems.length - 1].createdAt,
          pageItems[pageItems.length - 1].id,
        )
      : undefined;
    const metaMap = await this.messageEngagementService.buildMetaMap(
      pageItems.map((reply) => reply.id),
      userId,
    );

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
    directConversationId: string,
    messageId: string,
    replyId: string,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const reply = await this.prisma.message.findFirst({
      where: {
        id: replyId,
        workspaceId,
        directConversationId,
        parentMessageId: messageId,
      },
      include: this.messagePresenterService.messageInclude(),
    });

    if (!reply) {
      throw new NotFoundException('DM thread reply not found');
    }

    const meta =
      await this.messageEngagementService.getReactionSummaryForMessage(
        reply.id,
        userId,
      );

    return this.messagePresenterService.mapMessage(reply, userId, meta);
  }

  async updateThreadReply(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    messageId: string,
    replyId: string,
    dto: UpdateMessageDto,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const reply = await this.prisma.message.findFirst({
      where: {
        id: replyId,
        workspaceId,
        directConversationId,
        parentMessageId: messageId,
      },
      include: this.messagePresenterService.messageInclude(),
    });

    if (!reply) {
      throw new NotFoundException('DM thread reply not found');
    }

    if (reply.type === 'system') {
      throw new BadRequestException('System messages cannot be edited');
    }

    this.dmAccessService.assertCanMutateMessage(
      userId,
      reply.senderUserId,
      reply.createdAt,
    );

    if (reply.deletedAt) {
      throw new BadRequestException('Cannot edit deleted reply');
    }

    const nextContent =
      dto.content !== undefined ? dto.content.trim() : undefined;
    if (dto.content !== undefined && (nextContent?.length ?? 0) === 0) {
      throw new BadRequestException('Reply content cannot be empty');
    }

    await this.messageValidationService.validateDmMentionMetadata({
      metadata: dto.metadata,
      workspaceId,
      directConversationId,
    });

    const updated = await this.prisma.message.update({
      where: { id: reply.id },
      data: {
        ...(nextContent !== undefined ? { content: nextContent } : {}),
        ...(dto.metadata !== undefined
          ? { metadata: dto.metadata as Prisma.InputJsonValue }
          : {}),
        editedAt: new Date(),
      },
      include: this.messagePresenterService.messageInclude(),
    });

    return this.mapMessageWithEngagement(updated, userId);
  }

  async deleteThreadReply(
    userId: string,
    workspaceId: string,
    directConversationId: string,
    messageId: string,
    replyId: string,
  ) {
    await this.dmAccessService.resolveConversationAccess(
      userId,
      workspaceId,
      directConversationId,
    );

    const reply = await this.prisma.message.findFirst({
      where: {
        id: replyId,
        workspaceId,
        directConversationId,
        parentMessageId: messageId,
      },
      select: {
        id: true,
        type: true,
        senderUserId: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    if (!reply) {
      throw new NotFoundException('DM thread reply not found');
    }

    if (reply.type === 'system') {
      throw new BadRequestException('System messages cannot be deleted');
    }

    this.dmAccessService.assertCanMutateMessage(
      userId,
      reply.senderUserId,
      reply.createdAt,
    );

    if (!reply.deletedAt) {
      await this.prisma.message.update({
        where: { id: reply.id },
        data: {
          content: null,
          metadata: Prisma.JsonNull,
          deletedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      messageId: reply.id,
    };
  }

  private async createMessageRecord(input: {
    userId: string;
    workspaceId: string;
    directConversationId: string;
    dto: CreateMessageDto;
    parentMessageId?: string;
  }) {
    await this.dmAccessService.resolveConversationAccess(
      input.userId,
      input.workspaceId,
      input.directConversationId,
    );

    const payload = this.messageValidationService.normalizeCreatePayload(
      input.dto,
    );

    await this.messageValidationService.validateDmMentionMetadata({
      metadata: input.dto.metadata,
      workspaceId: input.workspaceId,
      directConversationId: input.directConversationId,
    });

    const now = new Date();
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          workspaceId: input.workspaceId,
          directConversationId: input.directConversationId,
          senderUserId: input.userId,
          type: payload.type,
          content: payload.content,
          metadata: payload.metadata,
          ...(input.parentMessageId
            ? { parentMessageId: input.parentMessageId }
            : {}),
          attachments: {
            create: payload.attachments,
          },
        },
        include: this.messagePresenterService.messageInclude(),
      });

      await tx.directConversation.update({
        where: { id: input.directConversationId },
        data: {
          lastMessageAt: now,
        },
      });

      return created;
    });

    return this.mapMessageWithEngagement(message, input.userId);
  }

  private async mapMessageWithEngagement(
    message: Prisma.MessageGetPayload<{
      include: ReturnType<MessagePresenterService['messageInclude']>;
    }>,
    userId: string,
  ) {
    const meta =
      await this.messageEngagementService.getReactionSummaryForMessage(
        message.id,
        userId,
      );

    return this.messagePresenterService.mapMessage(message, userId, meta);
  }
}
