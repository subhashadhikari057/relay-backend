import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UploadContextDto {
  @ApiPropertyOptional({
    description: 'Optional workspace context for future media indexing.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Optional channel context for future media indexing.',
    example: '01968c93-2ee0-7fef-a798-afbaf289ad26',
  })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiPropertyOptional({
    description: 'Optional message context for future media indexing.',
    example: '01968c95-9999-7ad8-a98e-aa11bb22cc33',
  })
  @IsOptional()
  @IsUUID()
  messageId?: string;
}
