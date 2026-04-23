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
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { WorkspacePermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { ToggleMessageReactionDto } from './dto/toggle-message-reaction.dto';
import { ToggleMessageReactionResponseDto } from './dto/toggle-message-reaction-response.dto';
import { MessageReactionService } from './services/message-reaction.service';

@Controller(
  'api/mobile/workspaces/:workspaceId/channels/:channelId/messages/:messageId/reaction',
)
@ApiTags('Mobile Message Reactions')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class MessageReactionsMobileController {
  constructor(
    private readonly messageReactionService: MessageReactionService,
  ) {}

  @Post('toggle')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceMessagesReactionToggle',
    summary: 'Toggle Message Reaction',
    description:
      'Toggle one of the supported reactions for a message. Same emoji removes reaction, different emoji replaces it.',
  })
  @ApiBody({
    type: ToggleMessageReactionDto,
    description: 'Reaction toggle payload.',
  })
  @ApiOkResponse({
    type: ToggleMessageReactionResponseDto,
    description: 'Message reaction toggled successfully.',
  })
  toggleReaction(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Body() dto: ToggleMessageReactionDto,
  ) {
    return this.messageReactionService.toggleReaction({
      userId: currentUser.sub,
      workspaceId,
      channelId,
      messageId,
      dto,
    });
  }
}
