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
import { BasicSuccessResponseDto } from 'src/modules/workspaces/shared/dto/basic-success-response.dto';
import { AddDirectConversationMemberDto } from './dto/add-direct-conversation-member.dto';
import { DirectConversationDetailDto } from './dto/direct-conversation-detail.dto';
import { DirectConversationListResponseDto } from './dto/direct-conversation-list-response.dto';
import { DirectConversationUnreadCountResponseDto } from './dto/direct-conversation-unread-count-response.dto';
import { DirectConversationUnreadListResponseDto } from './dto/direct-conversation-unread-list-response.dto';
import { ListDirectConversationsQueryDto } from './dto/list-direct-conversations-query.dto';
import { OpenDirectConversationDto } from './dto/open-direct-conversation.dto';
import { SearchDirectMessagesQueryDto } from './dto/search-direct-messages-query.dto';
import { SearchDirectMessagesResponseDto } from './dto/search-direct-messages-response.dto';
import { UpdateDirectConversationDto } from './dto/update-direct-conversation.dto';
import { DmConversationService } from './services/dm-conversation.service';
import { DmReadStateService } from './services/dm-read-state.service';
import { DmSearchService } from './services/dm-search.service';

@Controller('api/mobile/workspaces/:workspaceId/dms')
@ApiTags('Mobile DMs')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class DmsMobileController {
  constructor(
    private readonly dmConversationService: DmConversationService,
    private readonly dmReadStateService: DmReadStateService,
    private readonly dmSearchService: DmSearchService,
  ) {}

  @Post()
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsOpen',
    summary: 'Open Or Create DM',
    description:
      'Open an existing 1-to-1 DM if it already exists for the same participants, or create a new 1-to-1/group DM in the workspace.',
  })
  @ApiBody({
    type: OpenDirectConversationDto,
    description: 'Direct conversation open/create payload.',
  })
  @ApiOkResponse({
    type: DirectConversationDetailDto,
    description: 'Direct conversation returned successfully.',
  })
  openConversation(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: OpenDirectConversationDto,
  ) {
    return this.dmConversationService.openConversation(
      currentUser.sub,
      workspaceId,
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
    operationId: 'mobileWorkspaceDmsList',
    summary: 'List DMs',
    description:
      'List direct conversations visible to the current user in the workspace with cursor pagination.',
  })
  @ApiOkResponse({
    type: DirectConversationListResponseDto,
    description: 'Direct conversations returned successfully.',
  })
  listConversations(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Query() query: ListDirectConversationsQueryDto,
  ) {
    return this.dmConversationService.listConversations(
      currentUser.sub,
      workspaceId,
      query,
    );
  }

  @Get('search')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsSearchMessages',
    summary: 'Search DM Messages',
    description:
      'Search non-deleted DM message content across visible direct conversations, optionally limited to one DM.',
  })
  @ApiOkResponse({
    type: SearchDirectMessagesResponseDto,
    description: 'DM search results returned successfully.',
  })
  searchMessages(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Query() query: SearchDirectMessagesQueryDto,
  ) {
    return this.dmSearchService.searchMessages(
      currentUser.sub,
      workspaceId,
      query,
    );
  }

  @Get('unread-counts')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsGetUnreadCounts',
    summary: 'Get Workspace DM Unread Counts',
    description:
      'Return unread message counts for all visible DM conversations in the workspace for current user.',
  })
  @ApiOkResponse({
    type: DirectConversationUnreadListResponseDto,
    description: 'DM unread counts returned successfully.',
  })
  getWorkspaceUnreadCounts(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.dmReadStateService.getWorkspaceUnreadCounts(
      currentUser.sub,
      workspaceId,
    );
  }

  @Get(':directConversationId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsGetById',
    summary: 'Get DM Detail',
    description: 'Get one DM conversation visible to current user.',
  })
  @ApiOkResponse({
    type: DirectConversationDetailDto,
    description: 'DM detail returned successfully.',
  })
  getConversationById(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
  ) {
    return this.dmConversationService.getConversationById(
      currentUser.sub,
      workspaceId,
      directConversationId,
    );
  }

  @Patch(':directConversationId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsUpdate',
    summary: 'Update Group DM',
    description: 'Update group DM title.',
  })
  @ApiBody({
    type: UpdateDirectConversationDto,
    description: 'Group DM update payload.',
  })
  @ApiOkResponse({
    type: DirectConversationDetailDto,
    description: 'DM updated successfully.',
  })
  updateConversation(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Body() dto: UpdateDirectConversationDto,
  ) {
    return this.dmConversationService.updateConversation(
      currentUser.sub,
      workspaceId,
      directConversationId,
      dto,
    );
  }

  @Post(':directConversationId/members')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsAddMember',
    summary: 'Add Group DM Member',
    description: 'Add one active workspace member into a group DM.',
  })
  @ApiBody({
    type: AddDirectConversationMemberDto,
    description: 'Target member payload for a group DM.',
  })
  @ApiOkResponse({
    type: DirectConversationDetailDto,
    description: 'DM member added successfully.',
  })
  addMember(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Body() dto: AddDirectConversationMemberDto,
  ) {
    return this.dmConversationService.addMember(
      currentUser.sub,
      workspaceId,
      directConversationId,
      dto,
    );
  }

  @Delete(':directConversationId/members/:userId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.delete,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsRemoveMember',
    summary: 'Remove Group DM Member',
    description: 'Remove one member from a group DM.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'DM member removed successfully.',
  })
  removeMember(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.dmConversationService.removeMember(
      currentUser.sub,
      workspaceId,
      directConversationId,
      userId,
    );
  }

  @Post(':directConversationId/leave')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsLeave',
    summary: 'Leave Group DM',
    description: 'Leave a group DM. One-to-one DMs cannot be left in v1.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Left group DM successfully.',
  })
  leaveConversation(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
  ) {
    return this.dmConversationService.leaveConversation(
      currentUser.sub,
      workspaceId,
      directConversationId,
    );
  }

  @Get(':directConversationId/messages/unread-count')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceDmsGetUnreadCount',
    summary: 'Get DM Unread Count',
    description: 'Return unread message count for one DM conversation.',
  })
  @ApiOkResponse({
    type: DirectConversationUnreadCountResponseDto,
    description: 'DM unread count returned successfully.',
  })
  getConversationUnreadCount(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('directConversationId', new ParseUUIDPipe())
    directConversationId: string,
  ) {
    return this.dmReadStateService.getConversationUnreadCount(
      currentUser.sub,
      workspaceId,
      directConversationId,
    );
  }
}
