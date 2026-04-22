import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType, MessageType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import { ALLOWED_UPLOAD_MIME_TYPES } from 'src/modules/upload/shared/constants/upload.constants';
import { WorkspacePolicyService } from 'src/modules/workspaces/shared/services/workspace-policy.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { ListThreadRepliesQueryDto } from './dto/list-thread-replies-query.dto';
import { MarkChannelReadDto } from './dto/mark-channel-read.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

type MessageCursor = {
  createdAt: string;
  id: string;
};

type ChannelAccess = {
  id: string;
  workspaceId: string;
  type: ChannelType;
  isArchived: boolean;
  isMember: boolean;
};

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

@Injectable()
export class MessagesMobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly workspacePolicyService: WorkspacePolicyService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
  ) {}

  async createMessage(
    userId: string,
    workspaceId: string,
    channelId: string,
    dto: CreateMessageDto,
  ) {
    const channel = await this.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.assertCanWriteToChannel(channel);

    const payload = this.normalizeCreatePayload(dto);
    await this.validateMentionMetadata({
      metadata: dto.metadata,
      workspaceId,
      channelId,
      channelType: channel.type,
    });
    const message = await this.prisma.message.create({
      data: {
        workspaceId,
        channelId,
        senderUserId: userId,
        type: payload.type,
        content: payload.content,
        metadata: payload.metadata,
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
      include: this.messageInclude(),
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_MESSAGE_CREATED,
        entityType: AuditEntityType.MESSAGE,
        entityId: message.id,
        metadata: {
          channelId,
          type: message.type,
          attachmentsCount: message.attachments.length,
        },
      }),
    );

    return this.mapMessage(message, userId);
  }

  async listMessages(
    userId: string,
    workspaceId: string,
    channelId: string,
    query: ListMessagesQueryDto,
  ) {
    await this.resolveChannelAccess(userId, workspaceId, channelId, {
      forRead: true,
    });

    const limit = this.normalizeLimit(query.limit);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;

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
      include: this.messageInclude(),
    });

    const hasNext = messages.length > limit;
    const pageItems = hasNext ? messages.slice(0, limit) : messages;
    const nextCursor = hasNext
      ? this.encodeCursor(
          pageItems[pageItems.length - 1].createdAt,
          pageItems[pageItems.length - 1].id,
        )
      : undefined;

    return {
      count: pageItems.length,
      nextCursor,
      messages: pageItems.map((message) => this.mapMessage(message, userId)),
    };
  }

  async getMessageById(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
  ) {
    await this.resolveChannelAccess(userId, workspaceId, channelId, {
      forRead: true,
    });

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        channelId,
        parentMessageId: null,
      },
      include: this.messageInclude(),
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.mapMessage(message, userId);
  }

  async updateMessage(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    const channel = await this.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.assertCanWriteToChannel(channel);

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        channelId,
        parentMessageId: null,
      },
      include: this.messageInclude(),
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    this.assertCanMutateMessage(
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
    await this.validateMentionMetadata({
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
          ? {
              metadata: dto.metadata as Prisma.InputJsonValue,
            }
          : {}),
        editedAt: new Date(),
      },
      include: this.messageInclude(),
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

    return this.mapMessage(updated, userId);
  }

  async deleteMessage(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
  ) {
    const channel = await this.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.assertCanWriteToChannel(channel);

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
        channelId,
        parentMessageId: null,
      },
      select: {
        id: true,
        senderUserId: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    this.assertCanMutateMessage(
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
    await this.resolveChannelAccess(userId, workspaceId, channelId, {
      forRead: true,
    });

    const message = await this.prisma.message.findFirst({
      where: {
        id: dto.lastReadMessageId,
        workspaceId,
        channelId,
      },
      select: { id: true },
    });

    if (!message) {
      throw new NotFoundException(
        'Referenced message not found in this channel',
      );
    }

    const now = new Date();
    await this.prisma.userChannelRead.upsert({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
      update: {
        lastReadMessageId: message.id,
        lastReadAt: now,
      },
      create: {
        userId,
        channelId,
        lastReadMessageId: message.id,
        lastReadAt: now,
      },
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_MESSAGE_READ_UPDATED,
        entityType: AuditEntityType.MESSAGE,
        entityId: message.id,
        metadata: { channelId },
      }),
    );

    return {
      success: true,
      lastReadMessageId: message.id,
      lastReadAt: now,
    };
  }

  async createThreadReply(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    dto: CreateMessageDto,
  ) {
    const channel = await this.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.assertCanWriteToChannel(channel);

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

    const payload = this.normalizeCreatePayload(dto);
    await this.validateMentionMetadata({
      metadata: dto.metadata,
      workspaceId,
      channelId,
      channelType: channel.type,
    });
    const reply = await this.prisma.message.create({
      data: {
        workspaceId,
        channelId,
        senderUserId: userId,
        type: payload.type,
        content: payload.content,
        metadata: payload.metadata,
        parentMessageId: parentMessage.id,
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
      include: this.messageInclude(),
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        workspaceId,
        actorUserId: userId,
        action: AuditAction.WORKSPACE_MESSAGE_THREAD_REPLY_CREATED,
        entityType: AuditEntityType.MESSAGE,
        entityId: reply.id,
        metadata: {
          channelId,
          parentMessageId: parentMessage.id,
          type: reply.type,
        },
      }),
    );

    return this.mapMessage(reply, userId);
  }

  async listThreadReplies(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    query: ListThreadRepliesQueryDto,
  ) {
    await this.resolveChannelAccess(userId, workspaceId, channelId, {
      forRead: true,
    });

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

    const limit = this.normalizeLimit(query.limit);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;

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
      include: this.messageInclude(),
    });

    const hasNext = replies.length > limit;
    const pageItems = hasNext ? replies.slice(0, limit) : replies;
    const nextCursor = hasNext
      ? this.encodeCursor(
          pageItems[pageItems.length - 1].createdAt,
          pageItems[pageItems.length - 1].id,
        )
      : undefined;

    return {
      count: pageItems.length,
      nextCursor,
      messages: pageItems.map((reply) => this.mapMessage(reply, userId)),
    };
  }

  async getThreadReplyById(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    replyId: string,
  ) {
    await this.resolveChannelAccess(userId, workspaceId, channelId, {
      forRead: true,
    });

    const reply = await this.prisma.message.findFirst({
      where: {
        id: replyId,
        workspaceId,
        channelId,
        parentMessageId: messageId,
      },
      include: this.messageInclude(),
    });

    if (!reply) {
      throw new NotFoundException('Thread reply not found');
    }

    return this.mapMessage(reply, userId);
  }

  async updateThreadReply(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    replyId: string,
    dto: UpdateMessageDto,
  ) {
    const channel = await this.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.assertCanWriteToChannel(channel);

    const reply = await this.prisma.message.findFirst({
      where: {
        id: replyId,
        workspaceId,
        channelId,
        parentMessageId: messageId,
      },
      include: this.messageInclude(),
    });

    if (!reply) {
      throw new NotFoundException('Thread reply not found');
    }

    this.assertCanMutateMessage(userId, reply.senderUserId, reply.createdAt);
    if (reply.deletedAt) {
      throw new BadRequestException('Cannot edit deleted reply');
    }

    const nextContent =
      dto.content !== undefined ? dto.content.trim() : undefined;
    if (dto.content !== undefined && (nextContent?.length ?? 0) === 0) {
      throw new BadRequestException('Reply content cannot be empty');
    }
    await this.validateMentionMetadata({
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
          ? {
              metadata: dto.metadata as Prisma.InputJsonValue,
            }
          : {}),
        editedAt: new Date(),
      },
      include: this.messageInclude(),
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

    return this.mapMessage(updated, userId);
  }

  async deleteThreadReply(
    userId: string,
    workspaceId: string,
    channelId: string,
    messageId: string,
    replyId: string,
  ) {
    const channel = await this.resolveChannelAccess(
      userId,
      workspaceId,
      channelId,
    );
    this.assertCanWriteToChannel(channel);

    const reply = await this.prisma.message.findFirst({
      where: {
        id: replyId,
        workspaceId,
        channelId,
        parentMessageId: messageId,
      },
      select: {
        id: true,
        senderUserId: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    if (!reply) {
      throw new NotFoundException('Thread reply not found');
    }

    this.assertCanMutateMessage(userId, reply.senderUserId, reply.createdAt);

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

  private async resolveViewerMembership(userId: string, workspaceId: string) {
    await this.workspacePolicyService.resolveMembershipOrThrow(
      userId,
      workspaceId,
    );
  }

  private async resolveChannelAccess(
    userId: string,
    workspaceId: string,
    channelId: string,
    options?: { forRead?: boolean },
  ): Promise<ChannelAccess> {
    await this.resolveViewerMembership(userId, workspaceId);

    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
        type: true,
        isArchived: true,
        members: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const isMember = channel.members.length > 0;
    if (channel.type === 'private' && !isMember) {
      throw new ForbiddenException(
        'You are not a member of this private channel',
      );
    }

    if (options?.forRead !== true && !isMember) {
      throw new ForbiddenException('Join channel before posting messages');
    }

    return {
      id: channel.id,
      workspaceId: channel.workspaceId,
      type: channel.type,
      isArchived: channel.isArchived,
      isMember,
    };
  }

  private assertCanWriteToChannel(channel: ChannelAccess) {
    if (channel.isArchived) {
      throw new BadRequestException('Archived channels are read-only');
    }

    if (!channel.isMember) {
      throw new ForbiddenException('Join channel before posting messages');
    }
  }

  private assertCanMutateMessage(
    userId: string,
    senderUserId: string,
    createdAt: Date,
  ) {
    if (userId !== senderUserId) {
      throw new ForbiddenException('You can only modify your own messages');
    }

    const editWindowMinutes = this.configService.get<number>(
      'messages.editWindowMinutes',
      30,
    );
    const windowMs = Math.max(editWindowMinutes, 1) * 60 * 1000;

    if (Date.now() - createdAt.getTime() > windowMs) {
      throw new ForbiddenException('Message edit/delete window has expired');
    }
  }

  private normalizeCreatePayload(dto: CreateMessageDto) {
    const type = dto.type ?? MessageType.text;
    if (type === MessageType.system) {
      throw new BadRequestException(
        'System messages cannot be created from this endpoint',
      );
    }

    const content = dto.content?.trim();
    const normalizedContent = content && content.length > 0 ? content : null;

    const attachments = (dto.attachments ?? []).map((item) => ({
      path: item.path.trim(),
      originalName: item.originalName.trim(),
      mimeType: item.mimeType.trim().toLowerCase(),
      size: item.size,
      sortOrder: item.sortOrder ?? 0,
      width: item.width,
      height: item.height,
      durationMs: item.durationMs,
    }));

    if (normalizedContent === null && attachments.length === 0) {
      throw new BadRequestException(
        'Message requires non-empty content or at least one attachment',
      );
    }

    if (type === MessageType.file && attachments.length === 0) {
      throw new BadRequestException(
        'File message requires at least one attachment',
      );
    }

    const allowedMimeTypes = new Set<string>(ALLOWED_UPLOAD_MIME_TYPES);
    attachments.forEach((attachment) => {
      if (attachment.path.startsWith('/') || attachment.path.includes('..')) {
        throw new BadRequestException(
          'Attachment path must be a safe relative path',
        );
      }
      if (!allowedMimeTypes.has(attachment.mimeType)) {
        throw new BadRequestException(
          `Unsupported attachment MIME type: ${attachment.mimeType}`,
        );
      }
      if (attachment.originalName.length === 0) {
        throw new BadRequestException(
          'Attachment originalName cannot be empty',
        );
      }
    });

    return {
      type,
      content: normalizedContent,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      attachments,
    };
  }

  private async validateMentionMetadata(input: {
    metadata?: Record<string, unknown>;
    workspaceId: string;
    channelId: string;
    channelType: ChannelType;
  }) {
    const mentionsValue = input.metadata?.mentions;
    if (mentionsValue === undefined) {
      return;
    }

    if (!Array.isArray(mentionsValue)) {
      throw new BadRequestException(
        'metadata.mentions must be an array of user ids',
      );
    }

    const mentionIds = Array.from(
      new Set(
        mentionsValue.map((value) => {
          if (typeof value !== 'string' || !this.isUuid(value)) {
            throw new BadRequestException(
              'metadata.mentions must contain valid UUID user ids',
            );
          }
          return value;
        }),
      ),
    );

    if (mentionIds.length === 0) {
      return;
    }

    const activeWorkspaceMembers = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId: input.workspaceId,
        isActive: true,
        userId: { in: mentionIds },
      },
      select: { userId: true },
    });

    const workspaceMemberIds = new Set(
      activeWorkspaceMembers.map((item) => item.userId),
    );
    if (mentionIds.some((id) => !workspaceMemberIds.has(id))) {
      throw new BadRequestException(
        'All mentioned users must be active members of this workspace',
      );
    }

    if (input.channelType !== ChannelType.private) {
      return;
    }

    const channelMembers = await this.prisma.channelMember.findMany({
      where: {
        channelId: input.channelId,
        userId: { in: mentionIds },
      },
      select: { userId: true },
    });

    const channelMemberIds = new Set(channelMembers.map((item) => item.userId));
    if (mentionIds.some((id) => !channelMemberIds.has(id))) {
      throw new BadRequestException(
        'For private channels, all mentioned users must be channel members',
      );
    }
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private normalizeLimit(limit?: number) {
    const value = limit ?? DEFAULT_LIMIT;
    if (value < 1) {
      return 1;
    }
    if (value > MAX_LIMIT) {
      return MAX_LIMIT;
    }
    return value;
  }

  private encodeCursor(createdAt: Date, id: string) {
    const payload: MessageCursor = {
      createdAt: createdAt.toISOString(),
      id,
    };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): MessageCursor {
    try {
      const raw = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(raw) as Partial<MessageCursor>;

      if (!parsed.createdAt || !parsed.id) {
        throw new Error('Invalid cursor payload');
      }

      return {
        createdAt: parsed.createdAt,
        id: parsed.id,
      };
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  private messageInclude() {
    return {
      sender: {
        select: {
          id: true,
          fullName: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      attachments: {
        orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
      },
      _count: {
        select: {
          threadReplies: true,
        },
      },
    };
  }

  private mapMessage(
    message: Prisma.MessageGetPayload<{
      include: ReturnType<MessagesMobileService['messageInclude']>;
    }>,
    viewerUserId: string,
  ) {
    const canMutate =
      message.senderUserId === viewerUserId &&
      Date.now() - message.createdAt.getTime() <=
        Math.max(
          this.configService.get<number>('messages.editWindowMinutes', 30),
          1,
        ) *
          60 *
          1000;

    return {
      id: message.id,
      workspaceId: message.workspaceId,
      channelId: message.channelId,
      senderUserId: message.senderUserId,
      type: message.type,
      content: message.deletedAt ? null : message.content,
      metadata:
        message.deletedAt ||
        !message.metadata ||
        typeof message.metadata !== 'object'
          ? null
          : (message.metadata as Record<string, unknown>),
      parentMessageId: message.parentMessageId,
      isDeleted: Boolean(message.deletedAt),
      deletedAt: message.deletedAt,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      author: {
        id: message.sender.id,
        fullName: message.sender.fullName,
        displayName: message.sender.displayName,
        avatarUrl: message.sender.avatarUrl,
      },
      attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        path: attachment.path,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        sortOrder: attachment.sortOrder,
        width: attachment.width,
        height: attachment.height,
        durationMs: attachment.durationMs,
      })),
      threadReplyCount: message.parentMessageId
        ? 0
        : message._count.threadReplies,
      canEdit: !message.deletedAt && canMutate,
      canDelete: !message.deletedAt && canMutate,
    };
  }
}
