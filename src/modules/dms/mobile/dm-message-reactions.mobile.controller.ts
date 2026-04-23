import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { ToggleMessageReactionDto } from 'src/modules/messages/mobile/dto/toggle-message-reaction.dto';
import { ToggleMessageReactionResponseDto } from 'src/modules/messages/mobile/dto/toggle-message-reaction-response.dto';
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { WorkspacePermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { DmReactionService } from './services/dm-reaction.service';

@Controller(
  'api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages/:messageId/reaction',
)
@ApiTags('Mobile DM Message Reactions')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class DmMessageReactionsMobileController {
  constructor(private readonly dmReactionService: DmReactionService) {}

  @Post('toggle')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesReactionToggle',
    summary: 'Toggle DM Message Reaction',
    description:
      'Toggle one of the supported reactions for a DM message. Same emoji removes reaction, different emoji replaces it.',
  })
  @ApiBody({
    type: ToggleMessageReactionDto,
    description: 'DM reaction toggle payload.',
  })
  @ApiOkResponse({
    type: ToggleMessageReactionResponseDto,
    description: 'DM message reaction toggled successfully.',
  })
  toggleReaction(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Body() dto: ToggleMessageReactionDto,
  ) {
    return this.dmReactionService.toggleReaction({
      userId: currentUser.sub,
      workspaceId,
      directConversationId,
      messageId,
      dto,
    });
  }
}
