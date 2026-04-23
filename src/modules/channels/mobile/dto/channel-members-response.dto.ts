import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelMemberItemDto } from './channel-member-item.dto';

export class ChannelMembersResponseDto {
  @ApiProperty({
    description: 'Number of channel members included in this page.',
    example: 20,
  })
  count!: number;

  @ApiPropertyOptional({
    description: 'Cursor for next member page.',
    example:
      'eyJqb2luZWRBdCI6IjIwMjYtMDQtMjJUMDg6MDA6MDAuMDAwWiIsInVzZXJJZCI6IjQz..."',
  })
  nextCursor?: string;

  @ApiProperty({
    description: 'Paged channel members list.',
    type: [ChannelMemberItemDto],
  })
  members!: ChannelMemberItemDto[];
}
