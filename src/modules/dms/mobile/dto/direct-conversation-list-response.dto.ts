import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectConversationSummaryDto } from './direct-conversation-summary.dto';

export class DirectConversationListResponseDto {
  @ApiProperty({
    description: 'Number of conversations included in this page.',
    example: 12,
  })
  count!: number;

  @ApiPropertyOptional({
    description: 'Cursor for next page. Omitted when there is no next page.',
    example:
      'eyJsYXN0TWVzc2FnZUF0IjoiMjAyNi0wNC0yM1QxMDowMDowMC4wMDBaIiwiaWQiOiIuLi4ifQ',
  })
  nextCursor?: string;

  @ApiProperty({
    description: 'Paged DM conversations.',
    type: [DirectConversationSummaryDto],
  })
  conversations!: DirectConversationSummaryDto[];
}
