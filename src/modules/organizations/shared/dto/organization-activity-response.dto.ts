import { ApiProperty } from '@nestjs/swagger';
import { OrganizationActivityItemDto } from './organization-activity-item.dto';

export class OrganizationActivityResponseDto {
  @ApiProperty({
    description: 'Number of activity events returned.',
    example: 10,
  })
  count!: number;

  @ApiProperty({
    description: 'Organization activity timeline.',
    type: OrganizationActivityItemDto,
    isArray: true,
  })
  activities!: OrganizationActivityItemDto[];
}
