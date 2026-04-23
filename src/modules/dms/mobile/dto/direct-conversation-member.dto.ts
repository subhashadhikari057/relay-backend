import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DirectConversationMemberDto {
  @ApiProperty({
    description: 'Member user id.',
    format: 'uuid',
    example: '4356b7ac-679b-4021-9ed8-a912624a3d8f',
  })
  userId!: string;

  @ApiProperty({
    description: 'Member email.',
    example: 'user@relay.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Full name.',
    example: 'Relay User',
  })
  fullName!: string;

  @ApiPropertyOptional({
    description: 'Display name.',
    nullable: true,
    example: 'User',
  })
  displayName!: string | null;

  @ApiPropertyOptional({
    description: 'Avatar URL.',
    nullable: true,
    example: 'uploads/2026/04/22/avatar.webp',
  })
  avatarUrl!: string | null;

  @ApiProperty({
    description: 'When the member joined the DM.',
    type: String,
    format: 'date-time',
    example: '2026-04-23T08:00:00.000Z',
  })
  joinedAt!: Date;
}
