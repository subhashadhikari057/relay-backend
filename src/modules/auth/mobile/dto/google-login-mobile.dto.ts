import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginMobileDto {
  @ApiProperty({
    description:
      'Google ID token returned by the frontend Google Sign-In SDK. Backend verifies this token server-side.',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjExampleGoogleIdToken',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
