import { ChannelType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ChannelSummaryDto {
  @ApiProperty({
    description: 'Channel id.',
    format: 'uuid',
    example: '50fa42be-2f56-42cf-9f6c-1472936e14d2',
  })
  id!: string;

  @ApiProperty({
    description: 'Workspace id that owns the channel.',
    format: 'uuid',
    example: '0b97d3ba-0562-48d4-8b10-92bee8bd9de8',
  })
  workspaceId!: string;

  @ApiProperty({
    description: 'Channel name.',
    example: 'general',
  })
  name!: string;

  @ApiProperty({
    description: 'Channel topic.',
    nullable: true,
    example: 'Eng standups, PRs, deploys',
  })
  topic!: string | null;

  @ApiProperty({
    description: 'Channel description.',
    nullable: true,
    example: 'Default workspace channel for team-wide discussion.',
  })
  description!: string | null;

  @ApiProperty({
    description: 'Channel visibility type.',
    enum: ChannelType,
    example: ChannelType.public,
  })
  type!: ChannelType;

  @ApiProperty({
    description: 'Whether channel is archived.',
    example: false,
  })
  isArchived!: boolean;

  @ApiProperty({
    description: 'Channel creator user id.',
    format: 'uuid',
    example: '4356b7ac-679b-4021-9ed8-a912624a3d8f',
  })
  createdById!: string;

  @ApiProperty({
    description: 'Total member count in this channel.',
    example: 12,
  })
  memberCount!: number;

  @ApiProperty({
    description: 'Whether current user is currently a channel member.',
    example: true,
  })
  isMember!: boolean;

  @ApiProperty({
    description: 'Created timestamp.',
    type: String,
    format: 'date-time',
    example: '2026-04-22T09:24:55.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last updated timestamp.',
    type: String,
    format: 'date-time',
    example: '2026-04-22T09:24:55.000Z',
  })
  updatedAt!: Date;
}
