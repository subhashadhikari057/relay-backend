import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Length } from 'class-validator';

export class UpdateMessageDto {
  @ApiPropertyOptional({
    description: 'Updated message content text.',
    example: 'Updated message text.',
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Updated metadata JSON object.',
    example: {
      editedByClientAt: '2026-04-22T12:10:00.000Z',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
