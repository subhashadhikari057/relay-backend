import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

function parseBoolean(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
}

export class UploadQueryDto {
  @ApiPropertyOptional({
    description:
      'When true, apply image optimization for image/* files. Non-images are stored unchanged.',
    example: true,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  optimize?: boolean;
}
