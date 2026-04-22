import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchMessageItemDto } from './search-message-item.dto';

export class SearchMessagesResponseDto {
  @ApiProperty({
    description: 'Number of messages included in this page.',
    example: 20,
  })
  count!: number;

  @ApiPropertyOptional({
    description: 'Cursor for next page. Omitted when there is no next page.',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA0LTIyVDA4OjAwOjAwLjAwMFoiLCJpZCI6Ijg3Zi...',
  })
  nextCursor?: string;

  @ApiProperty({
    description: 'Paged message search results.',
    type: [SearchMessageItemDto],
  })
  messages!: SearchMessageItemDto[];
}
