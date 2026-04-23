import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MarkDirectConversationReadDto {
  @ApiProperty({
    description: 'Last read DM message id in this conversation.',
    format: 'uuid',
    example: '7f42fd18-fb42-4f08-aad2-e81f9f8688af',
  })
  @IsUUID()
  lastReadMessageId!: string;
}
