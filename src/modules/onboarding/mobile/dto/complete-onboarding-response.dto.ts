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

}
