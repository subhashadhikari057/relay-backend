import { ApiProperty } from '@nestjs/swagger';

export class BasicSuccessResponseDto {
  @ApiProperty({
    description: 'Whether operation completed successfully.',
    example: true,
  })
  success!: boolean;
}
