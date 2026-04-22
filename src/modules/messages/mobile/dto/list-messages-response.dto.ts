import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageItemDto } from './message-item.dto';

export class ListMessagesResponseDto {
  @ApiProperty({
    description: 'Number of messages in current page.',
    example: 30,
  })
  count!: number;

  @ApiPropertyOptional({
    description: 'Opaque cursor for next page.',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA0LTIyVDEyOjAwOjAwLjAwMFoiLCJpZCI6IjRiYz...',
  })
  nextCursor?: string;

  @ApiProperty({
    description: 'Paged message list.',
    type: [MessageItemDto],
  })
  messages!: MessageItemDto[];
}
