import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AdminWorkspaceDeleteDto {
  @ApiProperty({
    description: 'Whether workspace should be soft-deleted.',
    example: true,
  })
  @IsBoolean()
  deleted!: boolean;
}
