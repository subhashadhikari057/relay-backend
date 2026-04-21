import { ApiProperty } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';

export class OrganizationInviteAcceptResponseDto {
  @ApiProperty({
    description: 'Whether invite acceptance was successful.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Organization id joined by the user.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  organizationId!: string;

  @ApiProperty({
    description: 'Role assigned after acceptance.',
    enum: OrganizationRole,
    example: OrganizationRole.member,
  })
  role!: OrganizationRole;
}
