import { ApiProperty } from '@nestjs/swagger';
import { AdminOrganizationListItemDto } from './admin-organization-list-item.dto';

export class AdminOrganizationsResponseDto {
  @ApiProperty({
    description: 'Total organizations returned in current page.',
    example: 10,
  })
  count!: number;

  @ApiProperty({
    description: 'Organizations matching admin filters.',
    type: AdminOrganizationListItemDto,
    isArray: true,
  })
  organizations!: AdminOrganizationListItemDto[];
}
