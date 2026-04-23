import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceSummaryDto } from './workspace-summary.dto';

export class WorkspaceListResponseDto {
  @ApiProperty({
    description: 'Total workspaces returned in this page.',
    example: 2,
  })
  count!: number;

  @ApiProperty({
    description: 'Workspaces where current user has active membership.',
    type: WorkspaceSummaryDto,
    isArray: true,
  })
  workspaces!: WorkspaceSummaryDto[];
}
