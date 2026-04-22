import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthSessionItemDto {
  @ApiProperty({
    description: 'Session unique identifier.',
    example: 'bf96f60f-8092-4b15-9991-a3955a4f2fd1',
  })
  sessionId!: string;

  @ApiPropertyOptional({
    description: 'Device/user-agent information captured for this session.',
    example: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
  })
  deviceInfo!: string | null;

  @ApiPropertyOptional({
    description: 'IP address captured when session was created or rotated.',
    example: '203.0.113.42',
  })
  ipAddress!: string | null;

  @ApiProperty({
    description: 'Whether this is the currently authenticated session.',
    example: true,
  })
  currentSession!: boolean;

  @ApiProperty({
    description: 'Session creation timestamp.',
    example: '2026-04-21T10:40:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last known activity timestamp for this session.',
    example: '2026-04-21T10:55:00.000Z',
  })
  lastActiveAt!: Date;

  @ApiProperty({
    description: 'Session expiry timestamp.',
    example: '2026-04-28T10:40:00.000Z',
  })
  expiresAt!: Date;
}
