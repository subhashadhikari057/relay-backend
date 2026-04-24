import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType, WorkspaceRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class OnboardingWorkspaceDto {
  @ApiProperty({
    description: 'Workspace display name.',
    example: 'Relay Labs',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional workspace description.',
    example: 'Workspace for product team collaboration.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Avatar image URL returned by upload API.',
    example: '/uploads/workspace/relay-labs.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Avatar color token or hex value.',
    example: '#4F46E5',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  avatarColor?: string;
}

export class OnboardingUserProfileDto {
  @ApiPropertyOptional({
    description: 'Display name shown in workspace.',
    example: 'Alex',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Avatar image URL returned by upload API.',
    example: '/uploads/avatar/alex.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Avatar color token or hex value.',
    example: '#0EA5E9',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  avatarColor?: string;
}

export class OnboardingInviteDto {
  @ApiProperty({
    description: 'Invitee email address.',
    example: 'new.member@relay.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Role to assign after invite acceptance.',
    enum: WorkspaceRole,
    default: WorkspaceRole.member,
    example: WorkspaceRole.member,
  })
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
}

export class OnboardingFirstChannelDto {
  @ApiProperty({
    description: 'First channel display name.',
    example: 'general',
    minLength: 2,
    maxLength: 80,
  })
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional short topic shown in channel header.',
    example: 'Team-wide updates and announcements.',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @Length(1, 250)
  topic?: string;

  @ApiPropertyOptional({
    description: 'Optional channel description.',
    example: 'Default workspace channel for the team.',
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

export class CompleteOnboardingDto {
  @ApiProperty({
    type: OnboardingWorkspaceDto,
    description: 'Workspace to create for first-time onboarding.',
  })
  @ValidateNested()
  @Type(() => OnboardingWorkspaceDto)
  workspace!: OnboardingWorkspaceDto;

  @ApiPropertyOptional({
    type: OnboardingUserProfileDto,
    description: 'Optional authenticated user profile updates.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingUserProfileDto)
  userProfile?: OnboardingUserProfileDto;

  @ApiPropertyOptional({
    type: [OnboardingInviteDto],
    description: 'Optional teammate invites to create.',
    maxItems: 20,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OnboardingInviteDto)
  invites?: OnboardingInviteDto[];

  @ApiPropertyOptional({
    type: OnboardingFirstChannelDto,
    description:
      'Optional customization for the default first public channel created during onboarding.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingFirstChannelDto)
  firstChannel?: OnboardingFirstChannelDto;
}
