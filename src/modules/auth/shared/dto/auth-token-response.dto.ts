import { ApiProperty } from '@nestjs/swagger';
import { AuthUserResponseDto } from './auth-user-response.dto';

export class AuthTokenResponseDto {
  @ApiProperty({
    description: 'JWT access token for bearer authorization.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTk1ZjdlYS02YTEyLTcwZjctYmY4Yi0yZWEwZWM0ZjRhYWEiLCJlbWFpbCI6InN1cGVyYWRtaW5AcmVsYXkuY29tIiwicGxhdGZvcm1Sb2xlIjoic3VwZXJhZG1pbiJ9.signature',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Authenticated user profile.',
    type: AuthUserResponseDto,
  })
  user!: AuthUserResponseDto;
}
