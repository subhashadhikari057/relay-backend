import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AdminOrganizationDeleteDto {
  @ApiProperty({
    description: 'Whether organization should be soft-deleted.',
    example: true,
  })
  @IsBoolean()
  deleted!: boolean;
}
