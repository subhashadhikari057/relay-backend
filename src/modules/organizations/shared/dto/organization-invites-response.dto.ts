import { ApiProperty } from '@nestjs/swagger';
import { OrganizationInviteItemDto } from './organization-invite-item.dto';

export class OrganizationInvitesResponseDto {
  @ApiProperty({
    description: 'Number of invites returned.',
    example: 3,
  })
  count!: number;

  @ApiProperty({
    description: 'Organization invites.',
    type: OrganizationInviteItemDto,
    isArray: true,
  })
  invites!: OrganizationInviteItemDto[];
}
