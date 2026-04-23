import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import { CreateMessageDto } from './dto/create-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { ListThreadRepliesQueryDto } from './dto/list-thread-replies-query.dto';
import { MarkChannelReadDto } from './dto/mark-channel-read.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageAccessService } from './services/message-access.service';
import { MessageEngagementService } from './services/message-engagement.service';
import { MessagePresenterService } from './services/message-presenter.service';
import { MessageQueryService } from './services/message-query.service';
import { MessageReadStateService } from './services/message-read-state.service';
import { MessageValidationService } from './services/message-validation.service';

@Injectable()
export class MessagesMobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
    private readonly messageAccessService: MessageAccessService,
    private readonly messageValidationService: MessageValidationService,
    private readonly messagePresenterService: MessagePresenterService,
    private readonly messageEngagementService: MessageEngagementService,
    private readonly messageQueryService: MessageQueryService,
    private readonly messageReadStateService: MessageReadStateService,
  ) {}

  createMessage(
    userId: string,
    workspaceId: string,
    channelId: string,
    dto: CreateMessageDto,
  ) {
    return this.createMessageRecord({
      userId,
      workspaceId,
      channelId,
      dto,
      auditAction: AuditAction.WORKSPACE_MESSAGE_CREATED,
      auditMetadata: {},
    });
  }

  listMessages(
    userId: string,
    workspaceId: string,
    channelId: string,
    query: ListMessagesQueryDto,
  ) {
    return this.messageQueryService.listMessages(
      userId,
      workspaceId,
      channelId,
      query,
    );
  }

  getMessageById(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
  ) {
    return this.messageQueryService.getMessageById(
      userId,
      workspaceId,
      channelId,
      messageId,
    );
  }

  async updateMessage(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    const channel = await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.messageAccessService.assertCanWriteToChannel(channel);

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

    if (message.type === 'system') {
      throw new BadRequestException('System messages cannot be edited');
    }

    this.messageAccessService.assertCanMutateMessage(
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

    await this.messageValidationService.validateMentionMetadata({
      metadata: dto.metadata,
      workspaceId,
      channelId,
      channelType: channel.type,
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

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_MESSAGE_UPDATED,
        entityType: AuditEntityType.MESSAGE,
        entityId: updated.id,
        metadata: { channelId },
      }),
    );

    return this.mapMessageWithEngagement(updated, userId);
  }

  async deleteMessage(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
  ) {
    const channel = await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.messageAccessService.assertCanWriteToChannel(channel);

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        channelId,
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
      throw new NotFoundException('Message not found');
    }

    if (message.type === 'system') {
      throw new BadRequestException('System messages cannot be deleted');
    }

    this.messageAccessService.assertCanMutateMessage(
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

      await this.auditService.recordSafe(
        this.auditEventFactory.build({
          workspaceId,
          actorUserId: userId,
          action: AuditAction.WORKSPACE_MESSAGE_DELETED,
          entityType: AuditEntityType.MESSAGE,
          entityId: message.id,
          metadata: { channelId },
        }),
      );
    }

    return {
      success: true,
      messageId: message.id,
    };
  }

  async markChannelRead(
    userId: string,
    workspaceId: string,
    channelId: string,
    dto: MarkChannelReadDto,
  ) {
    return this.messageReadStateService.markChannelRead(
      userId,
      workspaceId,
      channelId,
      dto,
    );
  }

  async createThreadReply(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    dto: CreateMessageDto,
  ) {
    const channel = await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.messageAccessService.assertCanWriteToChannel(channel);

    const parentMessage = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        channelId,
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
      channelId,
      dto,
      parentMessageId: parentMessage.id,
      channelType: channel.type,
      auditAction: AuditAction.WORKSPACE_MESSAGE_THREAD_REPLY_CREATED,
      auditMetadata: {
        parentMessageId: parentMessage.id,
      },
    });
  }

  listThreadReplies(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    query: ListThreadRepliesQueryDto,
  ) {
    return this.messageQueryService.listThreadReplies(
      userId,
      workspaceId,
      channelId,
      messageId,
      query,
    );
  }

  getThreadReplyById(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    replyId: string,
  ) {
    return this.messageQueryService.getThreadReplyById(
      userId,
      workspaceId,
      channelId,
      messageId,
      replyId,
    );
  }

  async updateThreadReply(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    replyId: string,
    dto: UpdateMessageDto,
  ) {
    const channel = await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.messageAccessService.assertCanWriteToChannel(channel);

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

    if (reply.type === 'system') {
      throw new BadRequestException('System messages cannot be edited');
    }

    this.messageAccessService.assertCanMutateMessage(
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

    await this.messageValidationService.validateMentionMetadata({
      metadata: dto.metadata,
      workspaceId,
      channelId,
      channelType: channel.type,
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

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_MESSAGE_THREAD_REPLY_UPDATED,
        entityType: AuditEntityType.MESSAGE,
        entityId: updated.id,
        metadata: { channelId, parentMessageId: messageId },
      }),
    );

    return this.mapMessageWithEngagement(updated, userId);
  }

  async deleteThreadReply(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    replyId: string,
  ) {
    const channel = await this.messageAccessService.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.messageAccessService.assertCanWriteToChannel(channel);

    const reply = await this.prisma.message.findFirst({
      where: {
        id: replyId,
        workspaceId,
        channelId,
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
      throw new NotFoundException('Thread reply not found');
    }

    if (reply.type === 'system') {
      throw new BadRequestException('System messages cannot be deleted');
    }

    this.messageAccessService.assertCanMutateMessage(
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

      await this.auditService.recordSafe(
        this.auditEventFactory.build({
          workspaceId,
          actorUserId: userId,
          action: AuditAction.WORKSPACE_MESSAGE_THREAD_REPLY_DELETED,
          entityType: AuditEntityType.MESSAGE,
          entityId: reply.id,
          metadata: { channelId, parentMessageId: messageId },
        }),
      );
    }

    return {
      success: true,
      messageId: reply.id,
    };
  }

  private async createMessageRecord(input: {
    userId: string;
    workspaceId: string;
    channelId: string;
    dto: CreateMessageDto;
    auditAction:
      | AuditAction.WORKSPACE_MESSAGE_CREATED
      | AuditAction.WORKSPACE_MESSAGE_THREAD_REPLY_CREATED;
    auditMetadata: Record<string, unknown>;
    parentMessageId?: string;
    channelType?: Parameters<
      MessageValidationService['validateMentionMetadata']
    >[0]['channelType'];
  }) {
    const channel = await this.messageAccessService.resolveChannelAccess(
      input.userId,
      input.workspaceId,
      input.channelId,
    );
    this.messageAccessService.assertCanWriteToChannel(channel);

    const payload = this.messageValidationService.normalizeCreatePayload(
      input.dto,
    );
    await this.messageValidationService.validateMentionMetadata({
      metadata: input.dto.metadata,
      workspaceId: input.workspaceId,
      channelId: input.channelId,
      channelType: input.channelType ?? channel.type,
    });

    const message = await this.prisma.message.create({
      data: {
        workspaceId: input.workspaceId,
        channelId: input.channelId,
        senderUserId: input.userId,
        type: payload.type,
        content: payload.content,
        metadata: payload.metadata,
        ...(input.parentMessageId
          ? { parentMessageId: input.parentMessageId }
          : {}),
        attachments: {
          create: payload.attachments.map((item) => ({
            path: item.path,
            originalName: item.originalName,
            mimeType: item.mimeType,
            size: item.size,
            sortOrder: item.sortOrder,
            width: item.width,
            height: item.height,
            durationMs: item.durationMs,
          })),
        },
      },
      include: this.messagePresenterService.messageInclude(),
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId: input.workspaceId,
        actorUserId: input.userId,
        action: input.auditAction,
        entityType: AuditEntityType.MESSAGE,
        entityId: message.id,
        metadata: {
          channelId: input.channelId,
          type: message.type,
          attachmentsCount: message.attachments.length,
          ...input.auditMetadata,
        },
      }),
    );

    return this.mapMessageWithEngagement(message, input.userId);
  }

  private async mapMessageWithEngagement(
    message: Prisma.MessageGetPayload<{
      include: ReturnType<MessagePresenterService['messageInclude']>;
    }>,
    viewerUserId: string,
  ) {
    const meta =
      await this.messageEngagementService.getReactionSummaryForMessage(
        message.id,
        viewerUserId,
      );

    return this.messagePresenterService.mapMessage(message, viewerUserId, meta);
  }
}
