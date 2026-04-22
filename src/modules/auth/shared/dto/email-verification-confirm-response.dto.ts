import { ApiProperty } from '@nestjs/swagger';

export class EmailVerificationConfirmResponseDto {
  @ApiProperty({
    description: 'Confirmation status.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Verification status after token confirmation.',
    example: true,
  })
  isEmailVerified!: boolean;

  @ApiProperty({
    description: 'Timestamp when email verification was completed.',
    example: '2026-04-21T10:05:00.000Z',
  })
  emailVerifiedAt!: Date;
}
