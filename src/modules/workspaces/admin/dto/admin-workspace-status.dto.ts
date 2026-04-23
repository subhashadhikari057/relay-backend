import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AdminWorkspaceStatusDto {
  @ApiProperty({
    description: 'Whether the workspace should remain active.',
    example: false,
  })
  @IsBoolean()
  isActive!: boolean;
}
