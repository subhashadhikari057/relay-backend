import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageItemDto } from 'src/modules/messages/mobile/dto/message-item.dto';

export class SearchDirectMessageItemDto extends MessageItemDto {
  @ApiPropertyOptional({
    description: 'Conversation title for group DMs.',
    nullable: true,
    example: 'Launch planning group',
  })
  conversationTitle!: string | null;

  @ApiProperty({
    description: 'Preview around the search match.',
    example: '...discussion about deploy readiness and rollout steps...',
  })
  matchPreview!: string;
}
