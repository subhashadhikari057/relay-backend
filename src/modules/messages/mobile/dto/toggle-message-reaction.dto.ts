import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { ALLOWED_MESSAGE_REACTIONS } from '../constants/message-reactions.constant';

export class ToggleMessageReactionDto {
  @ApiProperty({
    description: 'Allowed reaction emoji.',
    enum: ALLOWED_MESSAGE_REACTIONS,
    example: '👍',
  })
  @IsString()
  @IsIn(ALLOWED_MESSAGE_REACTIONS)
  emoji!: string;
}
