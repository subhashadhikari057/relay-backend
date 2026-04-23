import { ApiProperty } from '@nestjs/swagger';
import { MessageItemDto } from './message-item.dto';

export class PinnedMessagesResponseDto {
  @ApiProperty({
    description: 'Number of pinned messages returned.',
    example: 2,
  })
  count!: number;

  @ApiProperty({
    description: 'Pinned messages ordered by most recently pinned first.',
    type: [MessageItemDto],
  })
  messages!: MessageItemDto[];
}
