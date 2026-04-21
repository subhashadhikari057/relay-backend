import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';

export class OrganizationInviteItemDto {
  @ApiProperty({
    description: 'Invite id.',
    example: '01968c93-2ee0-7fef-a798-afbaf289ad26',
  })
  id!: string;

  @ApiProperty({
    description: 'Invite target email.',
    example: 'invitee@relay.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Role to assign upon acceptance.',
    enum: OrganizationRole,
    example: OrganizationRole.member,
  })
  role!: OrganizationRole;

  @ApiProperty({
    description: 'Invite status.',
    example: 'pending',
    enum: ['pending', 'accepted', 'revoked', 'expired'],
  })
  status!: 'pending' | 'accepted' | 'revoked' | 'expired';

  @ApiProperty({
    description: 'Invite expiration timestamp.',
    example: '2026-04-29T10:00:00.000Z',
  })
  expiresAt!: Date;

  @ApiPropertyOptional({
    description: 'Invite acceptance timestamp.',
    example: null,
  })
  acceptedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Invite revocation timestamp.',
    example: null,
  })
  revokedAt!: Date | null;

  @ApiProperty({
    description: 'Invite creation timestamp.',
    example: '2026-04-22T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Inviter user id.',
    example: '01968c8f-7777-7f21-bf00-9fa93cf2f111',
  })
  invitedById!: string;

  @ApiPropertyOptional({
    description: 'Inviter display name.',
    example: 'Relay Owner',
  })
  invitedByName!: string | null;
}
