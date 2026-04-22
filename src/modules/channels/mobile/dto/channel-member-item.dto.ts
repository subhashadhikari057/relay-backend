import { ChannelMemberRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ChannelMemberItemDto {
  @ApiProperty({
    description: 'Member user id.',
    format: 'uuid',
    example: '4356b7ac-679b-4021-9ed8-a912624a3d8f',
  })
  userId!: string;

  @ApiProperty({
    description: 'Member email.',
    example: 'user@relay.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Member full name.',
    example: 'Relay User',
  })
  fullName!: string;

  @ApiProperty({
    description: 'Member display name.',
    nullable: true,
    example: 'User',
  })
  displayName!: string | null;

  @ApiProperty({
    description: 'Role in channel.',
    enum: ChannelMemberRole,
    example: ChannelMemberRole.member,
  })
  role!: ChannelMemberRole;

  @ApiProperty({
    description: 'Channel joined timestamp.',
    type: String,
    format: 'date-time',
    example: '2026-04-22T09:24:55.000Z',
  })
  joinedAt!: Date;
}
