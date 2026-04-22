import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class MessageAttachmentInputDto {
  @ApiProperty({
    description: 'Relative upload path returned by upload module.',
    example: 'uploads/2026/04/22/abc123.webp',
  })
  @IsString()
  @Length(1, 500)
  path!: string;

  @ApiProperty({
    description: 'Original file name.',
    example: 'sprint-plan.pdf',
  })
  @IsString()
  @Length(1, 255)
  originalName!: string;

  @ApiProperty({
    description: 'MIME type from upload response.',
    example: 'application/pdf',
  })
  @IsString()
  @Length(1, 120)
  mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes.',
    example: 120304,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size!: number;

  @ApiPropertyOptional({
    description: 'Display sort order for attachments.',
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Image width (if available).',
    example: 1280,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({
    description: 'Image height (if available).',
    example: 720,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({
    description: 'Media duration in milliseconds (if available).',
    example: 15000,
    minimum: 1,
    maximum: 36000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36000000)
  durationMs?: number;
}
