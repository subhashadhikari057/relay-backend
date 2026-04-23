import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceInviteItemDto } from './workspace-invite-item.dto';

export class WorkspaceInvitesResponseDto {
  @ApiProperty({
    description: 'Number of invites returned.',
    example: 3,
  })
  count!: number;

  @ApiProperty({
    description: 'Workspace invites.',
    type: WorkspaceInviteItemDto,
    isArray: true,
  })
  invites!: WorkspaceInviteItemDto[];
}
