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
import { MobileWorkspaceActivityQueryDto } from 'src/modules/audit/dto/mobile-workspace-activity-query.dto';
import { MobileWorkspaceActivityResponseDto } from 'src/modules/audit/dto/mobile-workspace-activity-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { WorkspacePermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { BasicSuccessResponseDto } from '../shared/dto/basic-success-response.dto';
import { WorkspaceInviteResponseDto } from '../shared/dto/workspace-invite-response.dto';
import { WorkspaceInvitesResponseDto } from '../shared/dto/workspace-invites-response.dto';
import { WorkspaceListResponseDto } from '../shared/dto/workspace-list-response.dto';
import { WorkspaceMembershipMeResponseDto } from '../shared/dto/workspace-membership-me-response.dto';
import { WorkspaceMembersResponseDto } from '../shared/dto/workspace-members-response.dto';
import { WorkspaceSummaryDto } from '../shared/dto/workspace-summary.dto';
import { WorkspaceTransferOwnershipResponseDto } from '../shared/dto/workspace-transfer-ownership-response.dto';
import { WorkspaceMobileService } from './workspace.mobile.service';
import { AcceptWorkspaceInviteDto } from './dto/accept-workspace-invite.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { ListMyWorkspacesDto } from './dto/list-my-workspaces.dto';
import { WorkspaceInviteAcceptResponseDto } from './dto/workspace-invite-accept-response.dto';
import { TransferWorkspaceOwnershipDto } from './dto/transfer-workspace-ownership.dto';
import { UpdateWorkspaceMemberRoleDto } from './dto/update-workspace-member-role.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Controller('api/mobile/workspaces')
@ApiTags('Mobile Workspaces')
@UseGuards(AccessTokenGuard)
@ApiBearerAuth('bearer')
export class MobileWorkspaceController {
  constructor(
    private readonly workspaceMobileService: WorkspaceMobileService,
  ) {}

  @Post()
  @ApiOperation({
    operationId: 'mobileWorkspacesCreate',
    summary: 'Create Workspace',
    description:
      'Create an workspace and automatically assign authenticated user as owner.',
  })
  @ApiBody({
    type: CreateWorkspaceDto,
    description: 'Workspace creation payload.',
  })
  @ApiOkResponse({
    type: WorkspaceSummaryDto,
    description: 'Workspace created successfully.',
  })
  create(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaceMobileService.createWorkspace(currentUser.sub, dto);
  }

  @Get()
  @ApiOperation({
    operationId: 'mobileWorkspacesListMine',
    summary: 'List My Workspaces',
    description:
      'List active workspaces where authenticated user has active membership.',
  })
  @ApiOkResponse({
    type: WorkspaceListResponseDto,
    description: 'Workspace list returned successfully.',
  })
  listMy(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Query() query: ListMyWorkspacesDto,
  ) {
    return this.workspaceMobileService.listMyWorkspaces(currentUser.sub, query);
  }

  @Get('slug/:slug')
  @ApiOperation({
    operationId: 'mobileWorkspacesGetBySlug',
    summary: 'Get Workspace By Slug',
    description: 'Get workspace details by slug for current member.',
  })
  @ApiOkResponse({
    type: WorkspaceSummaryDto,
    description: 'Workspace details returned successfully.',
  })
  getBySlug(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('slug') slug: string,
  ) {
    return this.workspaceMobileService.getWorkspaceBySlugForMember(
      currentUser.sub,
      slug,
    );
  }

  @Get(':workspaceId')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.WORKSPACE,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesGetById',
    summary: 'Get Workspace',
    description: 'Get workspace details for current member.',
  })
  @ApiOkResponse({
    type: WorkspaceSummaryDto,
    description: 'Workspace details returned successfully.',
  })
  getById(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.workspaceMobileService.getWorkspaceByIdForMember(
      currentUser.sub,
      workspaceId,
    );
  }

  @Patch(':workspaceId')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.WORKSPACE,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesUpdateProfile',
    summary: 'Update Workspace Profile',
    description: 'Update workspace profile fields (name/description/avatar).',
  })
  @ApiBody({
    type: UpdateWorkspaceDto,
    description: 'Workspace update payload.',
  })
  @ApiOkResponse({
    type: WorkspaceSummaryDto,
    description: 'Workspace profile updated successfully.',
  })
  update(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspaceMobileService.updateWorkspaceProfile(
      currentUser.sub,
      workspaceId,
      dto,
    );
  }

  @Post(':workspaceId/invites')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.INVITES,
    action: PermissionAction.write,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesInviteMember',
    summary: 'Invite Member',
    description:
      'Create a one-time workspace invite for target email and role.',
  })
  @ApiBody({
    type: InviteWorkspaceMemberDto,
    description: 'Invite creation payload.',
  })
  @ApiOkResponse({
    type: WorkspaceInviteResponseDto,
    description: 'Invite created successfully.',
  })
  invite(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: InviteWorkspaceMemberDto,
  ) {
    return this.workspaceMobileService.inviteMember(
      currentUser,
      workspaceId,
      dto,
    );
  }

  @Get(':workspaceId/invites')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.INVITES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesListInvites',
    summary: 'List Invites',
    description: 'List workspace invites (owner/admin only).',
  })
  @ApiOkResponse({
    type: WorkspaceInvitesResponseDto,
    description: 'Workspace invites returned successfully.',
  })
  listInvites(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.workspaceMobileService.listInvitesForMember(
      currentUser.sub,
      workspaceId,
    );
  }

  @Delete(':workspaceId/invites/:inviteId')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.INVITES,
    action: PermissionAction.delete,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesRevokeInvite',
    summary: 'Revoke Invite',
    description: 'Revoke pending invite in workspace (owner/admin only).',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Invite revoked successfully.',
  })
  revokeInvite(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('inviteId', new ParseUUIDPipe()) inviteId: string,
  ) {
    return this.workspaceMobileService.revokeInviteForMember(
      currentUser.sub,
      workspaceId,
      inviteId,
    );
  }

  @Post('invites/accept')
  @ApiOperation({
    operationId: 'mobileWorkspacesAcceptInvite',
    summary: 'Accept Invite',
    description:
      'Accept workspace invite token for currently authenticated user.',
  })
  @ApiBody({
    type: AcceptWorkspaceInviteDto,
    description: 'Invite acceptance payload.',
  })
  @ApiOkResponse({
    type: WorkspaceInviteAcceptResponseDto,
    description: 'Invite accepted successfully.',
  })
  acceptInvite(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Body() dto: AcceptWorkspaceInviteDto,
  ) {
    return this.workspaceMobileService.acceptInvite(currentUser, dto.token);
  }

  @Get(':workspaceId/members')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MEMBERS,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesListMembers',
    summary: 'List Members',
    description: 'List active workspace members for current member.',
  })
  @ApiOkResponse({
    type: WorkspaceMembersResponseDto,
    description: 'Workspace members returned successfully.',
  })
  listMembers(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.workspaceMobileService.listMembers(
      currentUser.sub,
      workspaceId,
    );
  }

  @Get(':workspaceId/me')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.WORKSPACE,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesMe',
    summary: 'Get Workspace Me',
    description:
      'Get membership and permissions for current user in workspace.',
  })
  @ApiOkResponse({
    type: WorkspaceMembershipMeResponseDto,
    description: 'Workspace membership details returned successfully.',
  })
  meInWorkspace(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.workspaceMobileService.getMyMembership(
      currentUser.sub,
      workspaceId,
    );
  }

  @Get(':workspaceId/activity')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.ACTIVITY,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesActivity',
    summary: 'Get Workspace Activity',
    description: 'Get recent workspace activity timeline.',
  })
  @ApiOkResponse({
    type: MobileWorkspaceActivityResponseDto,
    description: 'Workspace activity returned successfully.',
  })
  activity(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Query() query: MobileWorkspaceActivityQueryDto,
  ) {
    return this.workspaceMobileService.getWorkspaceActivity(
      currentUser.sub,
      workspaceId,
      query,
    );
  }

  @Patch(':workspaceId/members/:memberUserId/role')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MEMBERS,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesUpdateMemberRole',
    summary: 'Update Member Role',
    description: 'Update role for a specific workspace member.',
  })
  @ApiBody({
    type: UpdateWorkspaceMemberRoleDto,
    description: 'Role update payload.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Member role updated successfully.',
  })
  updateMemberRole(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('memberUserId', new ParseUUIDPipe()) memberUserId: string,
    @Body() dto: UpdateWorkspaceMemberRoleDto,
  ) {
    return this.workspaceMobileService.updateMemberRole(
      currentUser.sub,
      workspaceId,
      memberUserId,
      dto,
    );
  }

  @Delete(':workspaceId/members/:memberUserId')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MEMBERS,
    action: PermissionAction.delete,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesRemoveMember',
    summary: 'Remove Member',
    description: 'Deactivate target member from workspace.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Member removed successfully.',
  })
  removeMember(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('memberUserId', new ParseUUIDPipe()) memberUserId: string,
  ) {
    return this.workspaceMobileService.removeMember(
      currentUser.sub,
      workspaceId,
      memberUserId,
    );
  }

  @Post(':workspaceId/transfer-ownership')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MEMBERS,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesTransferOwnership',
    summary: 'Transfer Ownership',
    description:
      'Transfer workspace ownership from current owner to another member.',
  })
  @ApiBody({
    type: TransferWorkspaceOwnershipDto,
    description: 'Ownership transfer payload.',
  })
  @ApiOkResponse({
    type: WorkspaceTransferOwnershipResponseDto,
    description: 'Workspace ownership transferred successfully.',
  })
  transferOwnership(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: TransferWorkspaceOwnershipDto,
  ) {
    return this.workspaceMobileService.transferOwnership(
      currentUser.sub,
      workspaceId,
      dto,
    );
  }

  @Post(':workspaceId/leave')
  @UseGuards(PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.WORKSPACE,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesLeave',
    summary: 'Leave Workspace',
    description: 'Leave workspace for current authenticated member.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Workspace left successfully.',
  })
  leave(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    return this.workspaceMobileService.leaveWorkspace(
      currentUser.sub,
      workspaceId,
    );
  }
}
