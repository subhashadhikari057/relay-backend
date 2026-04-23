import { ApiProperty } from '@nestjs/swagger';

export class MessageReactionSummaryDto {
  @ApiProperty({
    description: 'Reaction emoji.',
    example: '👍',
  })
  emoji!: string;

  @ApiProperty({
    description: 'Number of users who reacted with this emoji.',
    example: 3,
  })
  count!: number;
}
