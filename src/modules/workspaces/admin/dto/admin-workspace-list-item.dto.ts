import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminWorkspaceListItemDto {
  @ApiProperty({
    description: 'Workspace id.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  id!: string;

  @ApiProperty({
    description: 'Workspace name.',
    example: 'Relay Labs',
  })
  name!: string;

  @ApiProperty({
    description: 'Workspace slug.',
    example: 'relay-labs',
  })
  slug!: string;

  @ApiProperty({
    description: 'Whether workspace is active.',
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Soft delete timestamp.',
    example: null,
  })
  deletedAt!: Date | null;

  @ApiProperty({
    description: 'Workspace creation timestamp.',
    example: '2026-04-21T10:00:00.000Z',
  })
  createdAt!: Date;
}
