import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { WorkspacePermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { ChannelUnreadCountResponseDto } from './dto/channel-unread-count-response.dto';
import { WorkspaceUnreadCountsResponseDto } from './dto/workspace-unread-counts-response.dto';
import { MessageReadStateService } from './services/message-read-state.service';

@ApiTags('Mobile Message Read State')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
@Controller('api/mobile/workspaces/:workspaceId')
export class MessageReadStateMobileController {
  constructor(
    private readonly messageReadStateService: MessageReadStateService,
  ) {}

  @Get('messages/unread-counts')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceMessagesGetUnreadCounts',
    summary: 'Get Workspace Unread Counts',
    description:
      'Return unread message counts for all visible non-archived channels in the workspace for current user.',
  })
  @ApiOkResponse({
    type: WorkspaceUnreadCountsResponseDto,
    description: 'Workspace unread counts returned successfully.',
  })
  getWorkspaceUnreadCounts(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.messageReadStateService.getWorkspaceUnreadCounts(
      currentUser.sub,
      workspaceId,
    );
  }

  @Get('channels/:channelId/messages/unread-count')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceMessagesGetChannelUnreadCount',
    summary: 'Get Channel Unread Count',
    description:
      'Return unread message count for one channel using current user read pointer.',
  })
  @ApiOkResponse({
    type: ChannelUnreadCountResponseDto,
    description: 'Channel unread count returned successfully.',
  })
  getChannelUnreadCount(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ) {
    return this.messageReadStateService.getChannelUnreadCount(
      currentUser.sub,
      workspaceId,
      channelId,
    );
  }
}
