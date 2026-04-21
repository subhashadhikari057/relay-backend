import { ApiProperty } from '@nestjs/swagger';
import { OrganizationMemberItemDto } from './organization-member-item.dto';

export class OrganizationMembersResponseDto {
  @ApiProperty({
    description: 'Number of members returned.',
    example: 3,
  })
  count!: number;

  @ApiProperty({
    description: 'Organization members.',
    type: OrganizationMemberItemDto,
    isArray: true,
  })
  members!: OrganizationMemberItemDto[];
}
