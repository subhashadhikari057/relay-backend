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
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { WorkspacePermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { DeleteMessageResponseDto } from './dto/delete-message-response.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { ListMessagesResponseDto } from './dto/list-messages-response.dto';
import { ListThreadRepliesQueryDto } from './dto/list-thread-replies-query.dto';
import { ListThreadRepliesResponseDto } from './dto/list-thread-replies-response.dto';
import { MarkChannelReadDto } from './dto/mark-channel-read.dto';
import { MarkChannelReadResponseDto } from './dto/mark-channel-read-response.dto';
import { MessageItemDto } from './dto/message-item.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessagesMobileService } from './messages.mobile.service';

@Controller('api/mobile/workspaces/:workspaceId/channels/:channelId/messages')
@ApiTags('Mobile Messages')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class MessagesMobileController {
  constructor(private readonly messagesMobileService: MessagesMobileService) {}

  @Post()
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceMessagesCreate',
    summary: 'Create Message',
    description:
      'Create a top-level channel message. Requires channel write access and membership for posting.',
  })
  @ApiBody({
    type: CreateMessageDto,
    description: 'Message creation payload.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'Message created successfully.',
  })
  createMessage(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesMobileService.createMessage(
      currentUser.sub,
      workspaceId,
      channelId,
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
    operationId: 'mobileWorkspaceMessagesList',
    summary: 'List Channel Messages',
    description:
      'List top-level channel messages with cursor pagination. Thread replies are excluded from this timeline.',
  })
  @ApiOkResponse({
    type: ListMessagesResponseDto,
    description: 'Messages returned successfully.',
  })
  listMessages(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.messagesMobileService.listMessages(
      currentUser.sub,
      workspaceId,
      channelId,
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
    operationId: 'mobileWorkspaceMessagesGetById',
    summary: 'Get Message Detail',
    description:
      'Get a single top-level message by id in the channel timeline.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'Message detail returned successfully.',
  })
  getMessageById(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return this.messagesMobileService.getMessageById(
      currentUser.sub,
      workspaceId,
      channelId,
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
    operationId: 'mobileWorkspaceMessagesUpdate',
    summary: 'Update Message',
    description:
      'Update a top-level message authored by current user within edit window.',
  })
  @ApiBody({
    type: UpdateMessageDto,
    description: 'Message update payload.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'Message updated successfully.',
  })
  updateMessage(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesMobileService.updateMessage(
      currentUser.sub,
      workspaceId,
      channelId,
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
    operationId: 'mobileWorkspaceMessagesDelete',
    summary: 'Delete Message',
    description:
      'Soft-delete a top-level message authored by current user within delete window.',
  })
  @ApiOkResponse({
    type: DeleteMessageResponseDto,
    description: 'Message deleted successfully.',
  })
  deleteMessage(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ) {
    return this.messagesMobileService.deleteMessage(
      currentUser.sub,
      workspaceId,
      channelId,
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
    operationId: 'mobileWorkspaceMessagesMarkRead',
    summary: 'Mark Channel Read',
    description: 'Persist user read pointer in channel via lastReadMessageId.',
  })
  @ApiBody({
    type: MarkChannelReadDto,
    description: 'Read pointer payload.',
  })
  @ApiOkResponse({
    type: MarkChannelReadResponseDto,
    description: 'Read pointer updated successfully.',
  })
  markChannelRead(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() dto: MarkChannelReadDto,
  ) {
    return this.messagesMobileService.markChannelRead(
      currentUser.sub,
      workspaceId,
      channelId,
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
    operationId: 'mobileWorkspaceMessagesCreateThreadReply',
    summary: 'Create Thread Reply',
    description:
      'Create one-level thread reply for parent message. Reply-to-reply is not allowed.',
  })
  @ApiBody({
    type: CreateMessageDto,
    description: 'Thread reply payload.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'Thread reply created successfully.',
  })
  createThreadReply(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesMobileService.createThreadReply(
      currentUser.sub,
      workspaceId,
      channelId,
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
    operationId: 'mobileWorkspaceMessagesListThreadReplies',
    summary: 'List Thread Replies',
    description:
      'List one-level thread replies for a top-level message with cursor pagination.',
  })
  @ApiOkResponse({
    type: ListThreadRepliesResponseDto,
    description: 'Thread replies returned successfully.',
  })
  listThreadReplies(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Query() query: ListThreadRepliesQueryDto,
  ) {
    return this.messagesMobileService.listThreadReplies(
      currentUser.sub,
      workspaceId,
      channelId,
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
    operationId: 'mobileWorkspaceMessagesGetThreadReplyById',
    summary: 'Get Thread Reply Detail',
    description: 'Get a specific reply under a specific parent message.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'Thread reply detail returned successfully.',
  })
  getThreadReplyById(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Param('replyId', new ParseUUIDPipe()) replyId: string,
  ) {
    return this.messagesMobileService.getThreadReplyById(
      currentUser.sub,
      workspaceId,
      channelId,
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
    operationId: 'mobileWorkspaceMessagesUpdateThreadReply',
    summary: 'Update Thread Reply',
    description:
      'Update a thread reply authored by current user within edit window.',
  })
  @ApiBody({
    type: UpdateMessageDto,
    description: 'Reply update payload.',
  })
  @ApiOkResponse({
    type: MessageItemDto,
    description: 'Thread reply updated successfully.',
  })
  updateThreadReply(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Param('replyId', new ParseUUIDPipe()) replyId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesMobileService.updateThreadReply(
      currentUser.sub,
      workspaceId,
      channelId,
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
    operationId: 'mobileWorkspaceMessagesDeleteThreadReply',
    summary: 'Delete Thread Reply',
    description:
      'Soft-delete a thread reply authored by current user within delete window.',
  })
  @ApiOkResponse({
    type: DeleteMessageResponseDto,
    description: 'Thread reply deleted successfully.',
  })
  deleteThreadReply(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Param('replyId', new ParseUUIDPipe()) replyId: string,
  ) {
    return this.messagesMobileService.deleteThreadReply(
      currentUser.sub,
      workspaceId,
      channelId,
      messageId,
      replyId,
    );
  }
}
