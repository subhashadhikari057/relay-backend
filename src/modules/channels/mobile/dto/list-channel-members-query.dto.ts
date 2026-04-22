import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IncludeArchivedQueryDto } from './include-archived-query.dto';

export class ListChannelMembersQueryDto extends IncludeArchivedQueryDto {
  @ApiPropertyOptional({
    description:
      'Opaque cursor from previous response. Uses joinedAt/userId ordering.',
    example:
      'eyJqb2luZWRBdCI6IjIwMjYtMDQtMjJUMDg6MDA6MDAuMDAwWiIsInVzZXJJZCI6IjQz..."',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Maximum members to return.',
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
