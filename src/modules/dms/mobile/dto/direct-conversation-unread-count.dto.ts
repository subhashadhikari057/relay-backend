import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DirectConversationUnreadCountDto {
  @ApiProperty({
    description: 'DM conversation id.',
    format: 'uuid',
    example: '2a6d8e88-7698-4cf7-a0f5-6dc8d4571e71',
  })
  directConversationId!: string;

  @ApiProperty({
    description: 'Unread DM message count for current user.',
    example: 4,
  })
  unreadCount!: number;

  @ApiPropertyOptional({
    description: 'Persisted last read message id for this DM.',
    nullable: true,
    format: 'uuid',
    example: '7f42fd18-fb42-4f08-aad2-e81f9f8688af',
  })
  lastReadMessageId!: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when read pointer was last updated.',
    nullable: true,
    type: String,
    format: 'date-time',
    example: '2026-04-23T10:00:00.000Z',
  })
  lastReadAt!: Date | null;
}
