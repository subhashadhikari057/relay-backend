import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmailVerificationRequestResponseDto {
  @ApiProperty({
    description: 'Request status.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Human-readable status message.',
    example: 'Verification email has been sent.',
  })
  message!: string;

  @ApiProperty({
    description: 'Whether user email is currently verified.',
    example: false,
  })
  isEmailVerified!: boolean;

  @ApiPropertyOptional({
    description:
      'Email verification timestamp if already verified; otherwise null.',
    example: '2026-04-21T10:00:00.000Z',
  })
  emailVerifiedAt!: Date | null;
}
