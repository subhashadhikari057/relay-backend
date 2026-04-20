import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ConfirmEmailVerificationDto {
  @ApiProperty({
    description: 'Raw email verification token from verification link.',
    example: 'c7dd06c3d8ab40d70adf9ce5a71297a978f91e92bdf50751e76193c1ab5d26a3',
    minLength: 64,
    maxLength: 64,
  })
  @IsString()
  @Length(64, 64)
  token!: string;
}
