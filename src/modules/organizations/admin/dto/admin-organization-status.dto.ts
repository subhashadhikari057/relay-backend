import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AdminOrganizationStatusDto {
  @ApiProperty({
    description: 'Whether the organization should remain active.',
    example: false,
  })
  @IsBoolean()
  isActive!: boolean;
}
