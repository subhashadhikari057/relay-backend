import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IncludeArchivedQueryDto } from './include-archived-query.dto';

export class ListChannelsQueryDto extends IncludeArchivedQueryDto {
  @ApiPropertyOptional({
    description:
      'Opaque cursor from previous response. Uses createdAt/id ordering.',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA0LTIyVDA4OjAwOjAwLjAwMFoiLCJpZCI6Ijg3Zj..."',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Maximum channels to return.',
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
