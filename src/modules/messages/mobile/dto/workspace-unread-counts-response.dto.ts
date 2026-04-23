import { ApiProperty } from '@nestjs/swagger';
import { ChannelUnreadCountDto } from './channel-unread-count.dto';

export class WorkspaceUnreadCountsResponseDto {
  @ApiProperty({
    description: 'Total visible channels included in unread summary.',
    example: 8,
  })
  count!: number;

  @ApiProperty({
    description:
      'Total unread messages across visible channels for current user.',
    example: 26,
  })
  totalUnreadCount!: number;

  @ApiProperty({
    description: 'Per-channel unread counters for current user.',
    type: [ChannelUnreadCountDto],
  })
  channels!: ChannelUnreadCountDto[];
}
