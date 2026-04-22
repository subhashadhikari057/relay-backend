import { ApiProperty } from '@nestjs/swagger';

class PolicyMaskChangeDto {
  @ApiProperty({ nullable: true, example: 1 })
  beforeMask!: number | null;

  @ApiProperty({ example: 5 })
  afterMask!: number;
}

export class UpdatePolicyResponseDto {
  @ApiProperty({ type: PolicyMaskChangeDto })
  change!: PolicyMaskChangeDto;
}
