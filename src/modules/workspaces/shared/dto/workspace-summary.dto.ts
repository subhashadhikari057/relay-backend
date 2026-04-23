import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';

export class WorkspaceSummaryDto {
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
    description: 'Optional workspace description.',
    example: 'Internal collaboration workspace.',
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Optional workspace avatar URL.',
    example: 'https://cdn.relay.com/orgs/relay-labs.png',
  })
  avatarUrl!: string | null;

  @ApiPropertyOptional({
    description: 'Optional workspace avatar color token or hex value.',
    example: '#4F46E5',
  })
  avatarColor!: string | null;

  @ApiProperty({
    description: 'Membership role of current user in this workspace.',
    enum: WorkspaceRole,
    example: WorkspaceRole.owner,
  })
  role!: WorkspaceRole;
}
