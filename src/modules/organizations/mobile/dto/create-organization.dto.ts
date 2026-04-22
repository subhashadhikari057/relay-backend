import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization display name.',
    example: 'Relay Labs',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional organization description.',
    example: 'Workspace for product team collaboration.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional avatar URL.',
    example: 'https://cdn.relay.com/orgs/relay-labs.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
