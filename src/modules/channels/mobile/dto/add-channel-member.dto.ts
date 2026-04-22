import { ChannelMemberRole } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class AddChannelMemberDto {
  @ApiProperty({
    description: 'Target workspace member user id.',
    example: '4356b7ac-679b-4021-9ed8-a912624a3d8f',
    format: 'uuid',
  })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    description: 'Role inside channel membership.',
    enum: ChannelMemberRole,
    default: ChannelMemberRole.member,
    example: ChannelMemberRole.member,
  })
  @IsOptional()
  @IsEnum(ChannelMemberRole)
  role: ChannelMemberRole = ChannelMemberRole.member;
}
