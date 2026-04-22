import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Logout operation status.',
    example: true,
  })
  success!: boolean;
}
