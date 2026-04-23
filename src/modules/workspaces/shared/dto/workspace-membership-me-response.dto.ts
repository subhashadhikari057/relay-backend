import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';

export class WorkspaceMembershipMeResponseDto {
  @ApiProperty({
    description: 'Workspace id.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  workspaceId!: string;

  @ApiProperty({
    description: 'Current user id.',
    example: '01968c8f-1234-7cd1-abcd-cc79f9d1d4d6',
  })
  userId!: string;

  @ApiProperty({
    description: 'Current user role in workspace.',
    enum: WorkspaceRole,
    example: WorkspaceRole.admin,
  })
  role!: WorkspaceRole;

  @ApiProperty({
    description: 'Membership active flag.',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Join timestamp.',
    example: '2026-04-22T11:00:00.000Z',
  })
  joinedAt!: Date;

  @ApiProperty({
    description: 'Whether user can invite others.',
    example: true,
  })
  canInvite!: boolean;

  @ApiProperty({
    description: 'Whether user can manage members.',
    example: true,
  })
  canManageMembers!: boolean;

  @ApiProperty({
    description: 'Whether user can edit workspace profile.',
    example: true,
  })
  canEditWorkspace!: boolean;
}
