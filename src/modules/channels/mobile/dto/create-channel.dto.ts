import { ChannelType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({
    description:
      'Channel display name (case-insensitive unique inside workspace).',
    example: 'engineering',
    minLength: 2,
    maxLength: 80,
  })
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional short topic shown in channel header/about section.',
    example: 'Eng standups, PRs, deploys',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @Length(1, 250)
  topic?: string;

  @ApiPropertyOptional({
    description: 'Optional channel description.',
    example: 'Product engineering discussions and planning.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Channel visibility type.',
    enum: ChannelType,
    default: ChannelType.public,
    example: ChannelType.public,
  })
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;
}
