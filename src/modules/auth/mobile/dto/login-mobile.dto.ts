import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginMobileDto {
  @ApiProperty({
    description: 'User email address.',
    example: 'user@relay.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'User password.',
    example: 'userpassword123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
