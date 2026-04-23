import { ApiProperty } from '@nestjs/swagger';
import { DirectConversationUnreadCountDto } from './direct-conversation-unread-count.dto';

export class DirectConversationUnreadListResponseDto {
  @ApiProperty({
    description: 'Total visible DM conversations included in unread summary.',
    example: 5,
  })
  count!: number;

  @ApiProperty({
    description: 'Total unread DM messages across visible conversations.',
    example: 11,
  })
  totalUnreadCount!: number;

  @ApiProperty({
    description: 'Per-DM unread counters for current user.',
    type: [DirectConversationUnreadCountDto],
  })
  conversations!: DirectConversationUnreadCountDto[];
}
