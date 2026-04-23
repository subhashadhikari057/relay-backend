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

export class SearchDirectMessagesQueryDto {
  @ApiProperty({
    description: 'Search term used against DM message content.',
    example: 'deploy',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  query!: string;

  @ApiPropertyOptional({
    description: 'Optional DM conversation filter.',
    format: 'uuid',
    example: '2a6d8e88-7698-4cf7-a0f5-6dc8d4571e71',
  })
  @IsOptional()
  @IsUUID()
  directConversationId?: string;

  @ApiPropertyOptional({
    description: 'Opaque cursor from previous search page.',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA0LTIzVDA4OjAwOjAwLjAwMFoiLCJpZCI6IjRiYy4uLiJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Maximum DM search results per page.',
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
