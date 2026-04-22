import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupMobileDto {
  @ApiProperty({
    description: 'New user email address.',
    example: 'user@relay.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'New user password.',
    example: 'userpassword123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    description: 'Full name of the user.',
    example: 'Relay User',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  fullName!: string;

  @ApiPropertyOptional({
    description: 'Optional display name shown in the app.',
    example: 'relay_user',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;
}
