import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminOrganizationListItemDto {
  @ApiProperty({
    description: 'Organization id.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  id!: string;

  @ApiProperty({
    description: 'Organization name.',
    example: 'Relay Labs',
  })
  name!: string;

  @ApiProperty({
    description: 'Organization slug.',
    example: 'relay-labs',
  })
  slug!: string;

  @ApiProperty({
    description: 'Whether organization is active.',
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Soft delete timestamp.',
    example: null,
  })
  deletedAt!: Date | null;

  @ApiProperty({
    description: 'Organization creation timestamp.',
    example: '2026-04-21T10:00:00.000Z',
  })
  createdAt!: Date;
}
