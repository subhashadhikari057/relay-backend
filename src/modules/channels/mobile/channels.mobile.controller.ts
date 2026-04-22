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
import { AddChannelMemberDto } from './dto/add-channel-member.dto';
import { ChannelMemberItemDto } from './dto/channel-member-item.dto';
import { ChannelMembersResponseDto } from './dto/channel-members-response.dto';
import { ChannelsListResponseDto } from './dto/channels-list-response.dto';
import { ChannelSummaryDto } from './dto/channel-summary.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { IncludeArchivedQueryDto } from './dto/include-archived-query.dto';
import { ListChannelMembersQueryDto } from './dto/list-channel-members-query.dto';
import { ListChannelsQueryDto } from './dto/list-channels-query.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelsMobileService } from './channels.mobile.service';

@Controller('api/mobile/workspaces/:workspaceId/channels')
@ApiTags('Mobile Channels')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class ChannelsMobileController {
  constructor(private readonly channelsMobileService: ChannelsMobileService) {}

  @Post()
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.CHANNELS,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceChannelsCreate',
    summary: 'Create Channel',
    description:
      'Create a new workspace channel. Domain invariant: workspace owner only.',
  })
  @ApiBody({
    type: CreateChannelDto,
    description: 'Channel creation payload.',
  })
  @ApiOkResponse({
    type: ChannelSummaryDto,
    description: 'Channel created successfully.',
  })
  createChannel(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsMobileService.createChannel(
      currentUser.sub,
      workspaceId,
      dto,
    );
  }

  @Get()
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.CHANNELS,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceChannelsList',
    summary: 'List Channels',
    description:
      'List channels in workspace with cursor pagination and optional archived inclusion.',
  })
  @ApiOkResponse({
    type: ChannelsListResponseDto,
    description: 'Channels returned successfully.',
  })
  listChannels(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Query() query: ListChannelsQueryDto,
  ) {
    return this.channelsMobileService.listChannels(
      currentUser.sub,
      workspaceId,
      query,
    );
  }

  @Get(':channelId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.CHANNELS,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceChannelsGetById',
    summary: 'Get Channel Detail',
    description:
      'Get one channel by id inside workspace. Supports includeArchived for owner/admin.',
  })
  @ApiOkResponse({
    type: ChannelSummaryDto,
    description: 'Channel detail returned successfully.',
  })
  getChannelById(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Query() query: IncludeArchivedQueryDto,
  ) {
    return this.channelsMobileService.getChannelById(
      currentUser.sub,
      workspaceId,
      channelId,
      query.includeArchived ?? false,
    );
  }

  @Patch(':channelId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.CHANNELS,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceChannelsUpdate',
    summary: 'Update Channel',
    description:
      'Update channel name/type. Domain invariant: workspace owner only.',
  })
  @ApiBody({
    type: UpdateChannelDto,
    description: 'Channel update payload.',
  })
  @ApiOkResponse({
    type: ChannelSummaryDto,
    description: 'Channel updated successfully.',
  })
  updateChannel(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelsMobileService.updateChannel(
      currentUser.sub,
      workspaceId,
      channelId,
      dto,
    );
  }

  @Delete(':channelId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.CHANNELS,
    action: PermissionAction.delete,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceChannelsArchive',
    summary: 'Archive Channel',
    description:
      'Archive channel (soft archive). Domain invariant: owner only.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Channel archived successfully.',
  })
  archiveChannel(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ) {
    return this.channelsMobileService.archiveChannel(
      currentUser.sub,
      workspaceId,
      channelId,
    );
  }

  @Post(':channelId/join')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.CHANNELS,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceChannelsJoin',
    summary: 'Join Channel',
    description: 'Join a public channel as current user.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Joined channel successfully.',
  })
  joinChannel(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ) {
    return this.channelsMobileService.joinChannel(
      currentUser.sub,
      workspaceId,
      channelId,
    );
  }

  @Delete(':channelId/leave')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.CHANNELS,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceChannelsLeave',
    summary: 'Leave Channel',
    description: 'Leave a channel where current user is a member.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Left channel successfully.',
  })
  leaveChannel(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ) {
    return this.channelsMobileService.leaveChannel(
      currentUser.sub,
      workspaceId,
      channelId,
    );
  }

  @Get(':channelId/members')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.CHANNEL_MEMBERS,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceChannelsListMembers',
    summary: 'List Channel Members',
    description:
      'List channel members with cursor pagination. Supports includeArchived for owner/admin.',
  })
  @ApiOkResponse({
    type: ChannelMembersResponseDto,
    description: 'Channel members returned successfully.',
  })
  listChannelMembers(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Query() query: ListChannelMembersQueryDto,
  ) {
    return this.channelsMobileService.listChannelMembers(
      currentUser.sub,
      workspaceId,
      channelId,
      query,
    );
  }

  @Post(':channelId/members')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.CHANNEL_MEMBERS,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceChannelsAddMember',
    summary: 'Add Channel Member',
    description:
      'Add or promote member in private channel. Domain invariant: workspace owner/admin only.',
  })
  @ApiBody({
    type: AddChannelMemberDto,
    description: 'Target member payload for private channel.',
  })
  @ApiOkResponse({
    type: ChannelMemberItemDto,
    description: 'Channel member added or updated successfully.',
  })
  addChannelMember(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() dto: AddChannelMemberDto,
  ) {
    return this.channelsMobileService.addChannelMember(
      currentUser.sub,
      workspaceId,
      channelId,
      dto,
    );
  }

  @Delete(':channelId/members/:userId')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.CHANNEL_MEMBERS,
    action: PermissionAction.delete,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceChannelsRemoveMember',
    summary: 'Remove Channel Member',
    description:
      'Remove member from private channel. Domain invariant: workspace owner/admin only and not last channel admin.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Channel member removed successfully.',
  })
  removeChannelMember(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.channelsMobileService.removeChannelMember(
      currentUser.sub,
      workspaceId,
      channelId,
      userId,
    );
  }
}
