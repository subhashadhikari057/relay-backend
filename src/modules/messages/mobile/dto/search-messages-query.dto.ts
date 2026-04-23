import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SearchMessagesQueryDto {
  @ApiProperty({
    description: 'Search term used against message content.',
    example: 'deploy',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  query!: string;

  @ApiPropertyOptional({
    description: 'Optional channel filter for in-channel search.',
    format: 'uuid',
    example: '50fa42be-2f56-42cf-9f6c-1472936e14d2',
  })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiPropertyOptional({
    description: 'Opaque cursor from previous search page.',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA0LTIyVDEyOjAwOjAwLjAwMFoiLCJpZCI6IjRiYz...',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Maximum search results per page.',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
