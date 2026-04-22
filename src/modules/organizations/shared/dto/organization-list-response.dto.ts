import { ApiProperty } from '@nestjs/swagger';
import { OrganizationSummaryDto } from './organization-summary.dto';

export class OrganizationListResponseDto {
  @ApiProperty({
    description: 'Total organizations returned in this page.',
    example: 2,
  })
  count!: number;

  @ApiProperty({
    description: 'Organizations where current user has active membership.',
    type: OrganizationSummaryDto,
    isArray: true,
  })
  organizations!: OrganizationSummaryDto[];
}
