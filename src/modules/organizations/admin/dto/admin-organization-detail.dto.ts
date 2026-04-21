import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminOrganizationDetailDto {
  @ApiProperty({
    description: 'Organization id.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  id!: string;

  @ApiProperty({
    description: 'Organization display name.',
    example: 'Relay Labs',
  })
  name!: string;

  @ApiProperty({
    description: 'Organization slug.',
    example: 'relay-labs',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Organization description.',
    example: 'Internal collaboration workspace.',
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Organization avatar URL.',
    example: 'https://cdn.relay.com/orgs/relay-labs.png',
  })
  avatarUrl!: string | null;

  @ApiProperty({
    description: 'Organization active flag.',
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Soft deletion timestamp, null when not deleted.',
    example: null,
  })
  deletedAt!: Date | null;

  @ApiProperty({
    description: 'Organization creation timestamp.',
    example: '2026-04-21T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Organization update timestamp.',
    example: '2026-04-21T10:30:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Creator user id.',
    example: '01968c8f-1234-7cd1-abcd-cc79f9d1d4d6',
  })
  createdById!: string;

  @ApiProperty({
    description: 'Total active members in this organization.',
    example: 5,
  })
  activeMembersCount!: number;

  @ApiProperty({
    description: 'Total active pending invites in this organization.',
    example: 2,
  })
  pendingInvitesCount!: number;
}
