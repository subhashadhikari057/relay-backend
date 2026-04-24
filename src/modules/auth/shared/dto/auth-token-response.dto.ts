import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceSummaryDto } from 'src/modules/workspaces/shared/dto/workspace-summary.dto';
import { AuthUserResponseDto } from './auth-user-response.dto';

export class AuthTokenResponseDto {
  @ApiProperty({
    description: 'JWT access token for bearer authorization.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTk1ZjdlYS02YTEyLTcwZjctYmY4Yi0yZWEwZWM0ZjRhYWEiLCJlbWFpbCI6InN1cGVyYWRtaW5AcmVsYXkuY29tIiwicGxhdGZvcm1Sb2xlIjoic3VwZXJhZG1pbiJ9.signature',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Authenticated user profile.',
    type: AuthUserResponseDto,
  })
  user!: AuthUserResponseDto;

  @ApiPropertyOptional({
    description:
      'Active workspace id for the authenticated session. Null when onboarding is not completed yet.',
    example: '2f9856f3-1af5-4d91-8d2c-2f5b2f8cb641',
    nullable: true,
  })
  activeWorkspaceId?: string | null;

  @ApiPropertyOptional({
    description:
      'Active workspace summary for the authenticated session. Null when onboarding is not completed yet.',
    type: WorkspaceSummaryDto,
    nullable: true,
  })
  activeWorkspace?: WorkspaceSummaryDto | null;
}
