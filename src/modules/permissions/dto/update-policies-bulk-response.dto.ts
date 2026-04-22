import { ApiProperty } from '@nestjs/swagger';

export class UpdatePoliciesBulkResponseDto {
  @ApiProperty({ example: 3 })
  count!: number;
}
