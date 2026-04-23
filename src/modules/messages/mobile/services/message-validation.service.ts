import { BadRequestException, Injectable } from '@nestjs/common';
import { ChannelType, MessageType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ALLOWED_UPLOAD_MIME_TYPES } from 'src/modules/upload/shared/constants/upload.constants';
import { CreateMessageDto } from '../dto/create-message.dto';
import { MessageCursor } from '../messages.types';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

@Injectable()
export class MessageValidationService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeCreatePayload(dto: CreateMessageDto) {
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

  async validateMentionMetadata(input: {
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

  async validateDmMentionMetadata(input: {
    metadata?: Record<string, unknown>;
    workspaceId: string;
    directConversationId: string;
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

    const dmMembers = await this.prisma.directConversationMember.findMany({
      where: {
        directConversationId: input.directConversationId,
        leftAt: null,
        userId: { in: mentionIds },
      },
      select: { userId: true },
    });

    const dmMemberIds = new Set(dmMembers.map((item) => item.userId));
    if (mentionIds.some((id) => !dmMemberIds.has(id))) {
      throw new BadRequestException(
        'All mentioned users must be active members of this DM conversation',
      );
    }
  }

  normalizeLimit(limit?: number) {
    const value = limit ?? DEFAULT_LIMIT;
    if (value < 1) {
      return 1;
    }
    if (value > MAX_LIMIT) {
      return MAX_LIMIT;
    }
    return value;
  }

  encodeCursor(createdAt: Date, id: string) {
    const payload: MessageCursor = {
      createdAt: createdAt.toISOString(),
      id,
    };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  decodeCursor(cursor: string): MessageCursor {
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

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
