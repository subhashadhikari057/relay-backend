import { PermissionPolicyRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';

export class UpdatePolicyDto {
  @ApiProperty({
    enum: PermissionPolicyRole,
    example: PermissionPolicyRole.admin,
    description: 'Target role for policy update.',
  })
  @IsEnum(PermissionPolicyRole)
  role!: PermissionPolicyRole;

  @ApiProperty({
    example: 'org.member',
    description: 'Permission resource key.',
  })
  @IsString()
  resource!: string;

  @ApiProperty({
    example: 5,
    description: 'CRUD bitmask value (READ=1, WRITE=2, UPDATE=4, DELETE=8).',
  })
  @IsInt()
  @Min(0)
  @Max(15)
  mask!: number;
}
