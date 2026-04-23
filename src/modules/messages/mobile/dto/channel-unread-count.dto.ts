import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelUnreadCountDto {
  @ApiProperty({
    description: 'Channel id.',
    format: 'uuid',
    example: '50fa42be-2f56-42cf-9f6c-1472936e14d2',
  })
  channelId!: string;

  @ApiProperty({
    description: 'Unread message count for current user in this channel.',
    example: 12,
  })
  unreadCount!: number;

  @ApiPropertyOptional({
    description: 'Persisted last read message id for this channel.',
    nullable: true,
    format: 'uuid',
    example: '7f42fd18-fb42-4f08-aad2-e81f9f8688af',
  })
  lastReadMessageId!: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when read pointer was last updated.',
    nullable: true,
    format: 'date-time',
    example: '2026-04-22T16:00:00.000Z',
  })
  lastReadAt!: Date | null;
}
