import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AcceptOrganizationInviteDto {
  @ApiProperty({
    description: 'Raw one-time organization invite token.',
    example: '0dc326a5d8a6f190ad0af632dbf849f64f4d68b7bb150dd95c54adf8bf1abbe0',
  })
  @IsString()
  @MinLength(32)
  token!: string;
}
