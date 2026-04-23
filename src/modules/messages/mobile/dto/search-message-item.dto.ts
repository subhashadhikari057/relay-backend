import { ApiProperty } from '@nestjs/swagger';
import { ChannelType } from '@prisma/client';
import { MessageItemDto } from './message-item.dto';

export class SearchMessageItemDto extends MessageItemDto {
  @ApiProperty({
    description: 'Matched channel name.',
    example: 'general',
  })
  channelName!: string;

  @ApiProperty({
    description: 'Matched channel type.',
    enum: ChannelType,
    example: ChannelType.public,
  })
  channelType!: ChannelType;

  @ApiProperty({
    description: 'Short preview around the search match.',
    example: '...discussion about deploy readiness and rollout steps...',
  })
  matchPreview!: string;
}
