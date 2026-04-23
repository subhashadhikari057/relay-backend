import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class OpenDirectConversationDto {
  @ApiProperty({
    description:
      'Workspace member user ids to include in the DM besides the current user. One id creates or retrieves a 1-to-1 DM. Two or more ids create a group DM.',
    type: [String],
    example: ['4356b7ac-679b-4021-9ed8-a912624a3d8f'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUUID(undefined, { each: true })
  participantUserIds!: string[];

  @ApiPropertyOptional({
    description:
      'Optional title for group DMs. Ignored for 1-to-1 conversations.',
    example: 'Design review group',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;
}
