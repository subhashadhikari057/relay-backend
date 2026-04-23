import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';

export class WorkspaceInviteAcceptResponseDto {
  @ApiProperty({
    description: 'Whether invite acceptance was successful.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Workspace id joined by the user.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  workspaceId!: string;

  @ApiProperty({
    description: 'Role assigned after acceptance.',
    enum: WorkspaceRole,
    example: WorkspaceRole.member,
  })
  role!: WorkspaceRole;
}
