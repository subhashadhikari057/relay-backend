import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminWorkspaceDetailDto {
  @ApiProperty({
    description: 'Workspace id.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  id!: string;

  @ApiProperty({
    description: 'Workspace display name.',
    example: 'Relay Labs',
  })
  name!: string;

  @ApiProperty({
    description: 'Workspace slug.',
    example: 'relay-labs',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Workspace description.',
    example: 'Internal collaboration workspace.',
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Workspace avatar URL.',
    example: 'https://cdn.relay.com/orgs/relay-labs.png',
  })
  avatarUrl!: string | null;

  @ApiProperty({
    description: 'Workspace active flag.',
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Soft deletion timestamp, null when not deleted.',
    example: null,
  })
  deletedAt!: Date | null;

  @ApiProperty({
    description: 'Workspace creation timestamp.',
    example: '2026-04-21T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Workspace update timestamp.',
    example: '2026-04-21T10:30:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Creator user id.',
    example: '01968c8f-1234-7cd1-abcd-cc79f9d1d4d6',
  })
  createdById!: string;

  @ApiProperty({
    description: 'Total active members in this workspace.',
    example: 5,
  })
  activeMembersCount!: number;

  @ApiProperty({
    description: 'Total active pending invites in this workspace.',
    example: 2,
  })
  pendingInvitesCount!: number;
}
