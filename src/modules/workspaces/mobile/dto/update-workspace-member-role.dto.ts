import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateWorkspaceMemberRoleDto {
  @ApiProperty({
    description: 'Next role for this member.',
    enum: WorkspaceRole,
    example: WorkspaceRole.admin,
  })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
