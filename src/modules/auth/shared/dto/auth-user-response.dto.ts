import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';

export class AuthUserResponseDto {
  @ApiProperty({
    description: 'User unique identifier.',
    example: '0195f7ea-6a12-70f7-bf8b-2ea0ec4f4aaa',
  })
  id!: string;

  @ApiProperty({
    description: 'User email address.',
    example: 'superadmin@relay.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User full name.',
    example: 'Relay Superadmin',
  })
  fullName!: string;

  @ApiPropertyOptional({
    description: 'Optional display name.',
    example: 'Superadmin',
  })
  displayName!: string | null;

  @ApiPropertyOptional({
    description: 'Optional avatar URL.',
    example: 'https://cdn.relay.com/avatars/superadmin.png',
  })
  avatarUrl!: string | null;

  @ApiPropertyOptional({
    description: 'Optional avatar color token or hex value.',
    example: '#4F46E5',
  })
  avatarColor!: string | null;

  @ApiPropertyOptional({
    description: 'Optional user status text.',
    example: 'Available',
  })
  status!: string | null;

  @ApiProperty({
    description: 'Whether the user account is active.',
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when email was verified. Null when not verified.',
    example: '2026-04-21T09:10:00.000Z',
  })
  emailVerifiedAt!: Date | null;

  @ApiProperty({
    description: 'Derived email verification status.',
    example: true,
  })
  isEmailVerified!: boolean;

  @ApiProperty({
    description: 'Platform-level role.',
    enum: PlatformRole,
    example: PlatformRole.superadmin,
  })
  platformRole!: PlatformRole;

  @ApiProperty({
    description: 'Account creation timestamp.',
    example: '2026-04-21T09:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp.',
    example: '2026-04-21T09:30:00.000Z',
  })
  updatedAt!: Date;
}
