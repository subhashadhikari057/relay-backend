import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({
    description: 'Updated workspace name.',
    example: 'Relay Labs Core',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated workspace description.',
    example: 'Collaboration space for core product team.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated avatar URL.',
    example: 'https://cdn.relay.com/orgs/relay-labs-core.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
