import { ApiProperty } from '@nestjs/swagger';
import { AdminWorkspaceListItemDto } from './admin-workspace-list-item.dto';

export class AdminWorkspacesResponseDto {
  @ApiProperty({
    description: 'Total workspaces returned in current page.',
    example: 10,
  })
  count!: number;

  @ApiProperty({
    description: 'Workspaces matching admin filters.',
    type: AdminWorkspaceListItemDto,
    isArray: true,
  })
  workspaces!: AdminWorkspaceListItemDto[];
}
