import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationActivityItemDto {
  @ApiProperty({
    description: 'Activity event type.',
    enum: [
      'invite_created',
      'invite_accepted',
      'invite_revoked',
      'member_joined',
    ],
    example: 'invite_created',
  })
  type!:
    | 'invite_created'
    | 'invite_accepted'
    | 'invite_revoked'
    | 'member_joined';

  @ApiProperty({
    description: 'Event timestamp.',
    example: '2026-04-22T12:00:00.000Z',
  })
  at!: Date;

  @ApiPropertyOptional({
    description: 'Related user id.',
    example: '01968c8f-1234-7cd1-abcd-cc79f9d1d4d6',
  })
  userId!: string | null;

  @ApiPropertyOptional({
    description: 'Related invite id.',
    example: '01968c93-2ee0-7fef-a798-afbaf289ad26',
  })
  inviteId!: string | null;

  @ApiPropertyOptional({
    description: 'Related note value (email/role context).',
    example: 'invitee@relay.com',
  })
  note!: string | null;
}
