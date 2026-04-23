import { MessageType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageAttachmentDto } from './message-attachment.dto';
import { MessageAuthorDto } from './message-author.dto';
import { MessageReactionSummaryDto } from './message-reaction-summary.dto';

export class MessageItemDto {
  @ApiProperty({
    description: 'Message id.',
    format: 'uuid',
    example: '7f42fd18-fb42-4f08-aad2-e81f9f8688af',
  })
  id!: string;

  @ApiProperty({
    description: 'Workspace id.',
    format: 'uuid',
    example: '0b97d3ba-0562-48d4-8b10-92bee8bd9de8',
  })
  workspaceId!: string;

  @ApiProperty({
    description: 'Channel id when message belongs to a channel.',
    format: 'uuid',
    nullable: true,
    example: '50fa42be-2f56-42cf-9f6c-1472936e14d2',
  })
  channelId!: string | null;

  @ApiProperty({
    description: 'Direct conversation id when message belongs to a DM.',
    format: 'uuid',
    nullable: true,
    example: '2a6d8e88-7698-4cf7-a0f5-6dc8d4571e71',
  })
  directConversationId!: string | null;

  @ApiProperty({
    description: 'Message author user id.',
    format: 'uuid',
    example: '4356b7ac-679b-4021-9ed8-a912624a3d8f',
  })
  senderUserId!: string;

  @ApiProperty({
    description: 'Message type.',
    enum: MessageType,
    example: MessageType.text,
  })
  type!: MessageType;

  @ApiPropertyOptional({
    description: 'Message textual content.',
    example: 'Hey team, sprint planning at 5 PM.',
    nullable: true,
  })
  content?: string | null;

  @ApiPropertyOptional({
    description: 'Arbitrary message metadata JSON.',
    nullable: true,
    example: { mentionUserIds: ['4356b7ac-679b-4021-9ed8-a912624a3d8f'] },
  })
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'Parent message id when this item is a thread reply.',
    format: 'uuid',
    nullable: true,
    example: '8869e42f-2f4e-44d0-987a-b657a8dd603a',
  })
  parentMessageId?: string | null;

  @ApiProperty({
    description: 'Whether message is soft deleted.',
    example: false,
  })
  isDeleted!: boolean;

  @ApiPropertyOptional({
    description: 'Soft delete timestamp.',
    format: 'date-time',
    nullable: true,
    example: '2026-04-22T12:00:00.000Z',
  })
  deletedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Edit timestamp.',
    format: 'date-time',
    nullable: true,
    example: '2026-04-22T12:05:00.000Z',
  })
  editedAt?: Date | null;

  @ApiProperty({
    description: 'Creation timestamp.',
    format: 'date-time',
    example: '2026-04-22T11:59:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp.',
    format: 'date-time',
    example: '2026-04-22T12:05:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Author object.',
    type: MessageAuthorDto,
  })
  author!: MessageAuthorDto;

  @ApiProperty({
    description: 'Attached files.',
    type: [MessageAttachmentDto],
  })
  attachments!: MessageAttachmentDto[];

  @ApiProperty({
    description: 'Thread reply count for top-level messages.',
    example: 4,
  })
  threadReplyCount!: number;

  @ApiProperty({
    description: 'Whether current user can edit this message now.',
    example: true,
  })
  canEdit!: boolean;

  @ApiProperty({
    description: 'Whether current user can delete this message now.',
    example: true,
  })
  canDelete!: boolean;

  @ApiProperty({
    description: 'Grouped reaction counts for the message.',
    type: [MessageReactionSummaryDto],
  })
  reactionSummary!: MessageReactionSummaryDto[];

  @ApiPropertyOptional({
    description: 'Current user reaction for this message.',
    nullable: true,
    example: '👍',
  })
  myReaction!: string | null;

  @ApiProperty({
    description: 'Whether the message is currently pinned.',
    example: false,
  })
  isPinned!: boolean;

  @ApiPropertyOptional({
    description: 'Pin timestamp when pinned.',
    nullable: true,
    format: 'date-time',
    example: '2026-04-22T16:00:00.000Z',
  })
  pinnedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'User id who pinned the message.',
    nullable: true,
    format: 'uuid',
    example: '4356b7ac-679b-4021-9ed8-a912624a3d8f',
  })
  pinnedByUserId!: string | null;
}
