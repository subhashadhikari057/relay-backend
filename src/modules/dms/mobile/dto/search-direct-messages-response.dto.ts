import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchDirectMessageItemDto } from './search-direct-message-item.dto';

export class SearchDirectMessagesResponseDto {
  @ApiProperty({
    description: 'Number of messages included in this page.',
    example: 20,
  })
  count!: number;

  @ApiPropertyOptional({
    description: 'Cursor for next page. Omitted when there is no next page.',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA0LTIzVDA4OjAwOjAwLjAwMFoiLCJpZCI6IjRiYy4uLiJ9',
  })
  nextCursor?: string;

  @ApiProperty({
    description: 'Paged DM message search results.',
    type: [SearchDirectMessageItemDto],
  })
  messages!: SearchDirectMessageItemDto[];
}
