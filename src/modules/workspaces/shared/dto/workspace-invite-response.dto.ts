import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceInviteResponseDto {
  @ApiProperty({
    description: 'Created invite id.',
    example: '01968c93-2ee0-7fef-a798-afbaf289ad26',
  })
  inviteId!: string;

  @ApiProperty({
    description:
      'Raw one-time invite token. Display this once and send via your delivery channel.',
    example: '0dc326a5d8a6f190ad0af632dbf849f64f4d68b7bb150dd95c54adf8bf1abbe0',
  })
  inviteToken!: string;

  @ApiProperty({
    description: 'Invite expiry timestamp.',
    example: '2026-04-28T12:00:00.000Z',
  })
  expiresAt!: Date;
}
