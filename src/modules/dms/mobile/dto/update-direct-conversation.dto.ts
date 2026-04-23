import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateDirectConversationDto {
  @ApiProperty({
    description: 'Updated title for a group DM.',
    example: 'Launch planning group',
  })
  @IsString()
  @MaxLength(160)
  title!: string;
}
