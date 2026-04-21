import { ApiProperty } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateOrganizationMemberRoleDto {
  @ApiProperty({
    description: 'Next role for this member.',
    enum: OrganizationRole,
    example: OrganizationRole.admin,
  })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
