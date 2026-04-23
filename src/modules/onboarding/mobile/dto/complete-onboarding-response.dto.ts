import { ApiProperty } from '@nestjs/swagger';
import { AuthTokenResponseDto } from 'src/modules/auth/shared/dto/auth-token-response.dto';
import { ChannelSummaryDto } from 'src/modules/channels/mobile/dto/channel-summary.dto';
import { WorkspaceInviteResponseDto } from 'src/modules/workspaces/shared/dto/workspace-invite-response.dto';
import { WorkspaceSummaryDto } from 'src/modules/workspaces/shared/dto/workspace-summary.dto';

export class CompleteOnboardingResponseDto extends AuthTokenResponseDto {
  @ApiProperty({
    type: WorkspaceSummaryDto,
    description: 'Created workspace.',
  })
  workspace!: WorkspaceSummaryDto;

  @ApiProperty({
    type: ChannelSummaryDto,
    description: 'Created first channel.',
  })
  firstChannel!: ChannelSummaryDto;

  @ApiProperty({
    type: [WorkspaceInviteResponseDto],
    description: 'Created invites with one-time tokens.',
  })
  invites!: WorkspaceInviteResponseDto[];

  @ApiProperty({
    description: 'Workspace id activated in the returned access token.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  activeWorkspaceId!: string;
}
