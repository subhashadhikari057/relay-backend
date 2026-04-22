import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MarkChannelReadDto {
  @ApiProperty({
    description: 'Last read message id in this channel.',
    format: 'uuid',
    example: '7f42fd18-fb42-4f08-aad2-e81f9f8688af',
  })
  @IsUUID()
  lastReadMessageId!: string;
}
