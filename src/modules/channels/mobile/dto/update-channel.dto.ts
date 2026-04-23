import { ChannelType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateChannelDto {
  @ApiPropertyOptional({
    description: 'Updated channel name.',
    example: 'product-updates',
    minLength: 2,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated topic. Send empty string to clear topic.',
    example: 'Roadmap sync, release prep',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @Length(0, 250)
  topic?: string;

  @ApiPropertyOptional({
    description:
      'Updated channel description. Send empty string to clear description.',
    example: 'Team channel for weekly launches.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated channel visibility type.',
    enum: ChannelType,
    example: ChannelType.private,
  })
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;
}
