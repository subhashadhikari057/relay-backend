import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberItemDto } from './workspace-member-item.dto';

export class WorkspaceMembersResponseDto {
  @ApiProperty({
    description: 'Number of members returned.',
    example: 3,
  })
  count!: number;

  @ApiProperty({
    description: 'Workspace members.',
    type: WorkspaceMemberItemDto,
    isArray: true,
  })
  members!: WorkspaceMemberItemDto[];
}
