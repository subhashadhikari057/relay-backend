import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { PinnedMessagesResponseDto } from './dto/pinned-messages-response.dto';
import { ToggleMessagePinResponseDto } from './dto/toggle-message-pin-response.dto';
import { MessagePinService } from './services/message-pin.service';

@Controller('api/mobile/workspaces/:workspaceId/channels/:channelId/messages')
@ApiTags('Mobile Message Pins')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class MessagePinsMobileController {
  constructor(private readonly messagePinService: MessagePinService) {}

  @Get('pins')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceMessagesListPinned',
    summary: 'List Pinned Messages',
    description:
      'List pinned messages for the channel ordered by most recently pinned first.',
  })
  @ApiOkResponse({
    type: PinnedMessagesResponseDto,
    description: 'Pinned messages returned successfully.',
  })
  listPinnedMessages(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ) {
    return this.messagePinService.listPinnedMessages(
      currentUser.sub,
      workspaceId,
      channelId,
    );
  }

  @Post(':messageId/pin/toggle')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceMessagesPinToggle',
    summary: 'Toggle Message Pin',
    description:
      'Pin or unpin a message in the channel. Toggling a pinned message removes the pin.',
  })
  @ApiOkResponse({
    type: ToggleMessagePinResponseDto,
    description: 'Message pin toggled successfully.',
  })
  togglePin(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return this.messagePinService.togglePin({
      userId: currentUser.sub,
      workspaceId,
      channelId,
      messageId,
    });
  }
}
