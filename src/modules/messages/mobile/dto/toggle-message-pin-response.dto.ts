import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ToggleMessagePinResponseDto {
  @ApiProperty({
    description: 'Toggle result.',
    enum: ['pinned', 'unpinned'],
    example: 'pinned',
  })
  action!: 'pinned' | 'unpinned';

  @ApiProperty({
    description: 'Target message id.',
    format: 'uuid',
    example: '7f42fd18-fb42-4f08-aad2-e81f9f8688af',
  })
  messageId!: string;

  @ApiProperty({
    description: 'Whether the message is pinned after toggle.',
    example: true,
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
