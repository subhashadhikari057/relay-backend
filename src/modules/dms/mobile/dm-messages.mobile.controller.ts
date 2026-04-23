import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { CreateMessageDto } from 'src/modules/messages/mobile/dto/create-message.dto';
import { DeleteMessageResponseDto } from 'src/modules/messages/mobile/dto/delete-message-response.dto';
import { ListMessagesResponseDto } from 'src/modules/messages/mobile/dto/list-messages-response.dto';
import { MessageItemDto } from 'src/modules/messages/mobile/dto/message-item.dto';
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { WorkspacePermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { UpdateMessageDto } from 'src/modules/messages/mobile/dto/update-message.dto';
import { ListDirectMessagesQueryDto } from './dto/list-direct-messages-query.dto';
import { ListDirectThreadRepliesQueryDto } from './dto/list-direct-thread-replies-query.dto';
import { MarkDirectConversationReadDto } from './dto/mark-direct-conversation-read.dto';
import { MarkDirectConversationReadResponseDto } from './dto/mark-direct-conversation-read-response.dto';
import { DmMessagesService } from './services/dm-messages.service';
import { DmReadStateService } from './services/dm-read-state.service';

@Controller(
  'api/mobile/workspaces/:workspaceId/dms/:directConversationId/messages',
)
@ApiTags('Mobile DM Messages')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class DmMessagesMobileController {
  constructor(
    private readonly dmMessagesService: DmMessagesService,
    private readonly dmReadStateService: DmReadStateService,
  ) {}

  @Post()
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesCreate',
    summary: 'Create DM Message',
    description: 'Create a top-level message inside a DM conversation.',
  })
  @ApiBody({
    type: CreateMessageDto,
    description: 'DM message creation payload.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'DM message created successfully.',
  })
  createMessage(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.dmMessagesService.createMessage(
      currentUser.sub,
      workspaceId,
      directConversationId,
      dto,
    );
  }

  @Get()
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesList',
    summary: 'List DM Messages',
    description:
      'List top-level DM messages with cursor pagination. Thread replies are excluded from this timeline.',
  })
  @ApiOkResponse({
    type: ListMessagesResponseDto,
    description: 'DM messages returned successfully.',
  })
  listMessages(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Query() query: ListDirectMessagesQueryDto,
  ) {
    return this.dmMessagesService.listMessages(
      currentUser.sub,
      workspaceId,
      directConversationId,
      query,
    );
  }

  @Get(':messageId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesGetById',
    summary: 'Get DM Message Detail',
    description: 'Get a single top-level DM message by id.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'DM message detail returned successfully.',
  })
  getMessageById(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return this.dmMessagesService.getMessageById(
      currentUser.sub,
      workspaceId,
      directConversationId,
      messageId,
    );
  }

  @Patch(':messageId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesUpdate',
    summary: 'Update DM Message',
    description:
      'Update a top-level DM message authored by current user within edit window.',
  })
  @ApiBody({
    type: UpdateMessageDto,
    description: 'DM message update payload.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'DM message updated successfully.',
  })
  updateMessage(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.dmMessagesService.updateMessage(
      currentUser.sub,
      workspaceId,
      directConversationId,
      messageId,
      dto,
    );
  }

  @Delete(':messageId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.delete,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesDelete',
    summary: 'Delete DM Message',
    description:
      'Soft-delete a top-level DM message authored by current user within delete window.',
  })
  @ApiOkResponse({
    type: DeleteMessageResponseDto,
    description: 'DM message deleted successfully.',
  })
  deleteMessage(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return this.dmMessagesService.deleteMessage(
      currentUser.sub,
      workspaceId,
      directConversationId,
      messageId,
    );
  }

  @Post('read')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesMarkRead',
    summary: 'Mark DM Read',
    description: 'Persist user read pointer in DM via lastReadMessageId.',
  })
  @ApiBody({
    type: MarkDirectConversationReadDto,
    description: 'DM read pointer payload.',
  })
  @ApiOkResponse({
    type: MarkDirectConversationReadResponseDto,
    description: 'DM read pointer updated successfully.',
  })
  markRead(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Body() dto: MarkDirectConversationReadDto,
  ) {
    return this.dmReadStateService.markConversationRead(
      currentUser.sub,
      workspaceId,
      directConversationId,
      dto,
    );
  }

  @Post(':messageId/thread')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesCreateThreadReply',
    summary: 'Create DM Thread Reply',
    description:
      'Create one-level DM thread reply for a parent message. Reply-to-reply is not allowed.',
  })
  @ApiBody({
    type: CreateMessageDto,
    description: 'DM thread reply payload.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'DM thread reply created successfully.',
  })
  createThreadReply(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.dmMessagesService.createThreadReply(
      currentUser.sub,
      workspaceId,
      directConversationId,
      messageId,
      dto,
    );
  }

  @Get(':messageId/thread')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesListThreadReplies',
    summary: 'List DM Thread Replies',
    description:
      'List one-level thread replies for a top-level DM message with cursor pagination.',
  })
  @ApiOkResponse({
    type: ListMessagesResponseDto,
    description: 'DM thread replies returned successfully.',
  })
  listThreadReplies(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Query() query: ListDirectThreadRepliesQueryDto,
  ) {
    return this.dmMessagesService.listThreadReplies(
      currentUser.sub,
      workspaceId,
      directConversationId,
      messageId,
      query,
    );
  }

  @Get(':messageId/thread/:replyId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesGetThreadReplyById',
    summary: 'Get DM Thread Reply Detail',
    description: 'Get one DM thread reply by id.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'DM thread reply detail returned successfully.',
  })
  getThreadReplyById(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Param('replyId', new ParseUUIDPipe()) replyId: string,
  ) {
    return this.dmMessagesService.getThreadReplyById(
      currentUser.sub,
      workspaceId,
      directConversationId,
      messageId,
      replyId,
    );
  }

  @Patch(':messageId/thread/:replyId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesUpdateThreadReply',
    summary: 'Update DM Thread Reply',
    description:
      'Update a DM thread reply authored by current user within edit window.',
  })
  @ApiBody({
    type: UpdateMessageDto,
    description: 'DM thread reply update payload.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'DM thread reply updated successfully.',
  })
  updateThreadReply(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Param('replyId', new ParseUUIDPipe()) replyId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.dmMessagesService.updateThreadReply(
      currentUser.sub,
      workspaceId,
      directConversationId,
      messageId,
      replyId,
      dto,
    );
  }

  @Delete(':messageId/thread/:replyId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.delete,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsMessagesDeleteThreadReply',
    summary: 'Delete DM Thread Reply',
    description:
      'Soft-delete a DM thread reply authored by current user within delete window.',
  })
  @ApiOkResponse({
    type: DeleteMessageResponseDto,
    description: 'DM thread reply deleted successfully.',
  })
  deleteThreadReply(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Param('replyId', new ParseUUIDPipe()) replyId: string,
  ) {
    return this.dmMessagesService.deleteThreadReply(
      currentUser.sub,
      workspaceId,
      directConversationId,
      messageId,
      replyId,
    );
  }
}
