import { ApiProperty } from '@nestjs/swagger';

export class RevokeSessionsResponseDto {
  @ApiProperty({
    description: 'Operation status.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Number of sessions revoked.',
    example: 2,
  })
  revokedCount!: number;
}
