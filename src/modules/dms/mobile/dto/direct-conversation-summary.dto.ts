import { DirectConversationType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectConversationMemberDto } from './direct-conversation-member.dto';

export class DirectConversationSummaryDto {
  @ApiProperty({
    description: 'DM conversation id.',
    format: 'uuid',
    example: '2a6d8e88-7698-4cf7-a0f5-6dc8d4571e71',
  })
  id!: string;

  @ApiProperty({
    description: 'Workspace id that owns the DM.',
    format: 'uuid',
    example: '3a7ecdeb-b0da-4f66-9ff1-3ac90492d88c',
  })
  workspaceId!: string;

  @ApiProperty({
    description: 'DM type.',
    enum: DirectConversationType,
    example: DirectConversationType.one_to_one,
  })
  type!: DirectConversationType;

  @ApiPropertyOptional({
    description:
      'Title for group DM. Null for 1-to-1 unless manually named later.',
    nullable: true,
    example: 'Design review group',
  })
  title!: string | null;

  @ApiProperty({
    description: 'Creator user id.',
    format: 'uuid',
    example: '15a3c8ca-bdc7-4351-9f4a-59eafa5db3b2',
  })
  createdById!: string;

  @ApiProperty({
    description: 'How many active members are in this DM.',
    example: 2,
  })
  memberCount!: number;

  @ApiProperty({
    description: 'Active DM members.',
    type: [DirectConversationMemberDto],
  })
  members!: DirectConversationMemberDto[];

  @ApiPropertyOptional({
    description: 'When a message was last sent in this DM.',
    nullable: true,
    type: String,
    format: 'date-time',
    example: '2026-04-23T09:00:00.000Z',
  })
  lastMessageAt!: Date | null;

  @ApiProperty({
    description: 'Created timestamp.',
    type: String,
    format: 'date-time',
    example: '2026-04-23T08:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Updated timestamp.',
    type: String,
    format: 'date-time',
    example: '2026-04-23T09:00:00.000Z',
  })
  updatedAt!: Date;
}
