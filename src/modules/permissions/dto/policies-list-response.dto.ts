import { PermissionPolicyRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

class PolicyItemDto {
  @ApiProperty({ example: '11f5f8af-4b7d-470b-a14c-c07f871f2fb9' })
  id!: string;

  @ApiProperty({ enum: ['platform', 'workspace'] })
  scope!: 'platform' | 'workspace';

  @ApiProperty({
    nullable: true,
    example: '7c025579-8f27-4d40-bb22-e3fbf027f440',
  })
  workspaceId!: string | null;

  @ApiProperty({ enum: PermissionPolicyRole })
  role!: PermissionPolicyRole;

  @ApiProperty({ example: 'workspace.member' })
  resource!: string;

  @ApiProperty({ example: 5 })
  mask!: number;

  @ApiProperty({ example: '2026-04-22T08:15:12.000Z' })
  updatedAt!: Date;
}

export class PoliciesListResponseDto {
  @ApiProperty({ example: 5 })
  count!: number;

  @ApiProperty({ type: [PolicyItemDto] })
  policies!: PolicyItemDto[];
}
