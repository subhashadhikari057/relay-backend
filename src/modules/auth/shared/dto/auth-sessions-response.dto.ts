import { ApiProperty } from '@nestjs/swagger';
import { AuthSessionItemDto } from './auth-session-item.dto';

export class AuthSessionsResponseDto {
  @ApiProperty({
    description: 'Number of active sessions.',
    example: 2,
  })
  count!: number;

  @ApiProperty({
    description: 'Active sessions for the authenticated user.',
    type: AuthSessionItemDto,
    isArray: true,
  })
  sessions!: AuthSessionItemDto[];
}
