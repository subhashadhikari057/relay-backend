import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';

export class OrganizationSummaryDto {
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
    description: 'Optional organization description.',
    example: 'Internal collaboration workspace.',
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Optional organization avatar URL.',
    example: 'https://cdn.relay.com/orgs/relay-labs.png',
  })
  avatarUrl!: string | null;

  @ApiProperty({
    description: 'Membership role of current user in this organization.',
    enum: OrganizationRole,
    example: OrganizationRole.owner,
  })
  role!: OrganizationRole;
}
