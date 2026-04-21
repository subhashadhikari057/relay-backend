import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class InviteOrganizationMemberDto {
  @ApiProperty({
    description: 'Invitee email address.',
    example: 'new.member@relay.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Role to assign after invite acceptance.',
    enum: OrganizationRole,
    example: OrganizationRole.member,
  })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;

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
