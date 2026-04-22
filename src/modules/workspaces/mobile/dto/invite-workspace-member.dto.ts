import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class InviteWorkspaceMemberDto {
  @ApiProperty({
    description: 'Invitee email address.',
    example: 'new.member@relay.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Role to assign after invite acceptance.',
    enum: WorkspaceRole,
    example: WorkspaceRole.member,
  })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;

  @ApiPropertyOptional({
    description: 'Invite validity in days.',
    example: 7,
    default: 7,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}
