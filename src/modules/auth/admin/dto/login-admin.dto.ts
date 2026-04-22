import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginAdminDto {
  @ApiProperty({
    description: 'Superadmin email address.',
    example: 'superadmin@relay.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Superadmin password.',
    example: 'superadmin123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
