import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';

export class WorkspaceMemberItemDto {
  @ApiProperty({
    description: 'Membership row id.',
    example: '01968c8e-5df5-77b3-9ac8-02fb797f5668',
  })
  membershipId!: string;

  @ApiProperty({
    description: 'User id of member.',
    example: '01968c8f-1234-7cd1-abcd-cc79f9d1d4d6',
  })
  userId!: string;

  @ApiProperty({
    description: 'Member email.',
    example: 'member@relay.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Member full name.',
    example: 'Relay Member',
  })
  fullName!: string;

  @ApiPropertyOptional({
    description: 'Optional member display name.',
    example: 'relay_member',
  })
  displayName!: string | null;

  @ApiProperty({
    description: 'Workspace role for this member.',
    enum: WorkspaceRole,
    example: WorkspaceRole.member,
  })
  role!: WorkspaceRole;

  @ApiProperty({
    description: 'When this user joined the workspace.',
    example: '2026-04-21T10:00:00.000Z',
  })
  joinedAt!: Date;

  @ApiPropertyOptional({
    description: 'Inviter user id, if invite-based onboarding was used.',
    example: '01968c8f-7777-7f21-bf00-9fa93cf2f111',
  })
  invitedById!: string | null;

  @ApiProperty({
    description: 'Whether this membership is currently active.',
    example: true,
  })
  isActive!: boolean;
}
