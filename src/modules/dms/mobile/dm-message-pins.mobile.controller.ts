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
import { PinnedMessagesResponseDto } from 'src/modules/messages/mobile/dto/pinned-messages-response.dto';
import { ToggleMessagePinResponseDto } from 'src/modules/messages/mobile/dto/toggle-message-pin-response.dto';
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { WorkspacePermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { DmPinService } from './services/dm-pin.service';

@Controller(
  'api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages',
)
@ApiTags('Mobile DM Message Pins')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class DmMessagePinsMobileController {
  constructor(private readonly dmPinService: DmPinService) {}

  @Get('pins')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesListPinned',
    summary: 'List Pinned DM Messages',
    description:
      'List pinned messages for the DM ordered by most recently pinned first.',
  })
  @ApiOkResponse({
    type: PinnedMessagesResponseDto,
    description: 'Pinned DM messages returned successfully.',
  })
  listPinnedMessages(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
  ) {
    return this.dmPinService.listPinnedMessages(
      currentUser.sub,
      workspaceId,
      directConversationId,
    );
  }

  @Post(':messageId/pin/toggle')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesPinToggle',
    summary: 'Toggle DM Message Pin',
    description:
      'Pin or unpin a message in the DM. Toggling a pinned message removes the pin.',
  })
  @ApiOkResponse({
    type: ToggleMessagePinResponseDto,
    description: 'DM message pin toggled successfully.',
  })
  togglePin(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return this.dmPinService.togglePin({
      userId: currentUser.sub,
      workspaceId,
      directConversationId,
      messageId,
    });
  }
}
