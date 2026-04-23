import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceTransferOwnershipResponseDto {
  @ApiProperty({
    description: 'Whether ownership transfer succeeded.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Previous owner user id.',
    example: '01968c8f-1234-7cd1-abcd-cc79f9d1d4d6',
  })
  previousOwnerUserId!: string;

  @ApiProperty({
    description: 'New owner user id.',
    example: '01968c8f-7777-7f21-bf00-9fa93cf2f111',
  })
  newOwnerUserId!: string;
}
