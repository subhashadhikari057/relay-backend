import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelSummaryDto } from './channel-summary.dto';

export class ChannelsListResponseDto {
  @ApiProperty({
    description: 'Number of channels included in this page.',
    example: 20,
  })
  count!: number;

  @ApiPropertyOptional({
    description: 'Cursor for next page. Omitted when there is no next page.',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA0LTIyVDA4OjAwOjAwLjAwMFoiLCJpZCI6Ijg3Zi..."',
  })
  nextCursor?: string;

  @ApiProperty({
    description: 'Paged channels list.',
    type: [ChannelSummaryDto],
  })
  channels!: ChannelSummaryDto[];
}
