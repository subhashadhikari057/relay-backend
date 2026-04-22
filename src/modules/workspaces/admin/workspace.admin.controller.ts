import {
  Body,
  Controller,
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
import { PlatformPermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { BasicSuccessResponseDto } from '../shared/dto/basic-success-response.dto';
import { WorkspaceInvitesResponseDto } from '../shared/dto/workspace-invites-response.dto';
import { WorkspaceMembersResponseDto } from '../shared/dto/workspace-members-response.dto';
import { WorkspaceAdminService } from './workspace.admin.service';
import { AdminWorkspaceDeleteDto } from './dto/admin-workspace-delete.dto';
import { AdminWorkspaceDetailDto } from './dto/admin-workspace-detail.dto';
import { AdminWorkspaceStatusDto } from './dto/admin-workspace-status.dto';
import { AdminWorkspacesResponseDto } from './dto/admin-workspaces-response.dto';
import { ListAdminWorkspacesDto } from './dto/list-admin-workspaces.dto';

@Controller('api/admin/workspaces')
@ApiTags('Admin Workspaces')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class AdminWorkspaceController {
  constructor(private readonly workspaceAdminService: WorkspaceAdminService) {}

  @Get()
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.WORKSPACES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'adminWorkspacesList',
    summary: 'List Workspaces',
    description:
      'List/search workspaces for platform owner operations with status filters.',
  })
  @ApiOkResponse({
    type: AdminWorkspacesResponseDto,
    description: 'Workspaces returned successfully.',
  })
  list(@Query() query: ListAdminWorkspacesDto) {
    return this.workspaceAdminService.listWorkspacesForAdmin(query);
  }

  @Get(':workspaceId')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.WORKSPACES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'adminWorkspacesGetById',
    summary: 'Get Workspace Details',
    description:
      'Return workspace details with active member and pending invite stats.',
  })
  @ApiOkResponse({
    type: AdminWorkspaceDetailDto,
    description: 'Workspace details returned successfully.',
  })
  getById(@Param('workspaceId', new ParseUUIDPipe()) workspaceId: string) {
    return this.workspaceAdminService.getWorkspaceDetailsForAdmin(workspaceId);
  }

  @Patch(':workspaceId/status')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.WORKSPACES,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'adminWorkspacesSetStatus',
    summary: 'Activate/Deactivate Workspace',
    description: 'Set workspace active status.',
  })
  @ApiBody({
    type: AdminWorkspaceStatusDto,
    description: 'Workspace status payload.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Workspace status updated successfully.',
  })
  setStatus(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: AdminWorkspaceStatusDto,
    @CurrentUser() currentUser: AuthJwtPayload,
  ) {
    return this.workspaceAdminService.setWorkspaceStatus(
      workspaceId,
      dto,
      currentUser,
    );
  }

  @Patch(':workspaceId/delete')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.WORKSPACES,
    action: PermissionAction.delete,
  })
  @ApiOperation({
    operationId: 'adminWorkspacesSetDeleted',
    summary: 'Soft Delete/Restore Workspace',
    description: 'Toggle soft-delete state for an workspace.',
  })
  @ApiBody({
    type: AdminWorkspaceDeleteDto,
    description: 'Workspace soft-delete payload.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Workspace delete status updated successfully.',
  })
  setDeleted(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: AdminWorkspaceDeleteDto,
    @CurrentUser() currentUser: AuthJwtPayload,
  ) {
    return this.workspaceAdminService.setWorkspaceDeleted(
      workspaceId,
      dto,
      currentUser,
    );
  }

  @Post(':workspaceId/invites/:inviteId/revoke')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.WORKSPACES,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'adminWorkspacesRevokeInvite',
    summary: 'Revoke Workspace Invite',
    description: 'Force revoke a pending workspace invite by id.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Invite revoked successfully.',
  })
  revokeInvite(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('inviteId', new ParseUUIDPipe()) inviteId: string,
    @CurrentUser() currentUser: AuthJwtPayload,
  ) {
    return this.workspaceAdminService.revokeInviteByAdmin(
      workspaceId,
      inviteId,
      currentUser,
    );
  }

  @Post(':workspaceId/members/:memberUserId/revoke')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.WORKSPACES,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'adminWorkspacesRevokeMember',
    summary: 'Revoke Workspace Member',
    description: 'Force deactivate a membership by user id.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Membership revoked successfully.',
  })
  revokeMember(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('memberUserId', new ParseUUIDPipe()) memberUserId: string,
    @CurrentUser() currentUser: AuthJwtPayload,
  ) {
    return this.workspaceAdminService.revokeMembershipByAdmin(
      workspaceId,
      memberUserId,
      currentUser,
    );
  }

  @Get(':workspaceId/invites')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.WORKSPACES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'adminWorkspacesListInvites',
    summary: 'List Workspace Invites',
    description: 'List all invites for an workspace for admin inspection.',
  })
  @ApiOkResponse({
    type: WorkspaceInvitesResponseDto,
    description: 'Workspace invites returned successfully.',
  })
  listInvites(@Param('workspaceId', new ParseUUIDPipe()) workspaceId: string) {
    return this.workspaceAdminService.listInvitesForAdmin(workspaceId);
  }

  @Get(':workspaceId/members')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.WORKSPACES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'adminWorkspacesListMembers',
    summary: 'List Workspace Members',
    description:
      'List all workspace members (active and inactive) for admin inspection.',
  })
  @ApiOkResponse({
    type: WorkspaceMembersResponseDto,
    description: 'Workspace members returned successfully.',
  })
  listMembers(@Param('workspaceId', new ParseUUIDPipe()) workspaceId: string) {
    return this.workspaceAdminService.listMembersForAdmin(workspaceId);
  }

  @Post(':workspaceId/restore')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.WORKSPACES,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'adminWorkspacesRestore',
    summary: 'Restore Workspace',
    description:
      'Restore a soft-deleted workspace and activate it for use again.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Workspace restored successfully.',
  })
  restore(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @CurrentUser() currentUser: AuthJwtPayload,
  ) {
    return this.workspaceAdminService.restoreWorkspace(
      workspaceId,
      currentUser,
    );
  }
}
