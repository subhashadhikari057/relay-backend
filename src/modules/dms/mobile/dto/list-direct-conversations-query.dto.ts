import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListDirectConversationsQueryDto {
  @ApiPropertyOptional({
    description: 'Opaque cursor from previous DM page.',
    example:
      'eyJsYXN0TWVzc2FnZUF0IjoiMjAyNi0wNC0yM1QxMDowMDowMC4wMDBaIiwiaWQiOiIuLi4ifQ',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Maximum DM conversations per page.',
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
