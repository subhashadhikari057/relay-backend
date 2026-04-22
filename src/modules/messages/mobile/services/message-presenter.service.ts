import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

@Injectable()
export class MessagePresenterService {
  constructor(private readonly configService: ConfigService) {}

  messageInclude() {
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

  mapMessage(
    message: Prisma.MessageGetPayload<{
      include: ReturnType<MessagePresenterService['messageInclude']>;
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
