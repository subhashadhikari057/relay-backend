import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageReactionSummaryDto } from './message-reaction-summary.dto';

export class ToggleMessageReactionResponseDto {
  @ApiProperty({
    description: 'Toggle result.',
    enum: ['added', 'removed', 'replaced'],
    example: 'added',
  })
  action!: 'added' | 'removed' | 'replaced';

  @ApiProperty({
    description: 'Target message id.',
    format: 'uuid',
    example: '7f42fd18-fb42-4f08-aad2-e81f9f8688af',
  })
  messageId!: string;

  @ApiPropertyOptional({
    description: 'Current user reaction after toggle. Null means removed.',
    nullable: true,
    example: '👍',
  })
  myReaction!: string | null;

  @ApiProperty({
    description: 'Grouped reaction counts for the message.',
    type: [MessageReactionSummaryDto],
  })
  reactionSummary!: MessageReactionSummaryDto[];
}
