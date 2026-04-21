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
import { PlatformRole } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PlatformRoles } from 'src/modules/auth/shared/decorators/platform-roles.decorator';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import { PlatformRoleGuard } from 'src/modules/auth/shared/guards/platform-role.guard';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { BasicSuccessResponseDto } from '../shared/dto/basic-success-response.dto';
import { OrganizationInvitesResponseDto } from '../shared/dto/organization-invites-response.dto';
import { OrganizationMembersResponseDto } from '../shared/dto/organization-members-response.dto';
import { OrganizationAdminService } from './organization.admin.service';
import { AdminOrganizationDeleteDto } from './dto/admin-organization-delete.dto';
import { AdminOrganizationDetailDto } from './dto/admin-organization-detail.dto';
import { AdminOrganizationStatusDto } from './dto/admin-organization-status.dto';
import { AdminOrganizationsResponseDto } from './dto/admin-organizations-response.dto';
import { ListAdminOrganizationsDto } from './dto/list-admin-organizations.dto';

@Controller('api/admin/organizations')
@ApiTags('Admin Organizations')
@UseGuards(AccessTokenGuard, PlatformRoleGuard)
@PlatformRoles(PlatformRole.superadmin)
@ApiBearerAuth('bearer')
export class AdminOrganizationController {
  constructor(
    private readonly organizationAdminService: OrganizationAdminService,
  ) {}

  @Get()
  @ApiOperation({
    operationId: 'adminOrganizationsList',
    summary: 'List Organizations',
    description:
      'List/search organizations for platform owner operations with status filters.',
  })
  @ApiOkResponse({
    type: AdminOrganizationsResponseDto,
    description: 'Organizations returned successfully.',
  })
  list(@Query() query: ListAdminOrganizationsDto) {
    return this.organizationAdminService.listOrganizationsForAdmin(query);
  }

  @Get(':organizationId')
  @ApiOperation({
    operationId: 'adminOrganizationsGetById',
    summary: 'Get Organization Details',
    description:
      'Return organization details with active member and pending invite stats.',
  })
  @ApiOkResponse({
    type: AdminOrganizationDetailDto,
    description: 'Organization details returned successfully.',
  })
  getById(
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.organizationAdminService.getOrganizationDetailsForAdmin(
      organizationId,
    );
  }

  @Patch(':organizationId/status')
  @ApiOperation({
    operationId: 'adminOrganizationsSetStatus',
    summary: 'Activate/Deactivate Organization',
    description: 'Set organization active status.',
  })
  @ApiBody({
    type: AdminOrganizationStatusDto,
    description: 'Organization status payload.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Organization status updated successfully.',
  })
  setStatus(
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() dto: AdminOrganizationStatusDto,
    @CurrentUser() currentUser: AuthJwtPayload,
  ) {
    return this.organizationAdminService.setOrganizationStatus(
      organizationId,
      dto,
      currentUser,
    );
  }

  @Patch(':organizationId/delete')
  @ApiOperation({
    operationId: 'adminOrganizationsSetDeleted',
    summary: 'Soft Delete/Restore Organization',
    description: 'Toggle soft-delete state for an organization.',
  })
  @ApiBody({
    type: AdminOrganizationDeleteDto,
    description: 'Organization soft-delete payload.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Organization delete status updated successfully.',
  })
  setDeleted(
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() dto: AdminOrganizationDeleteDto,
    @CurrentUser() currentUser: AuthJwtPayload,
  ) {
    return this.organizationAdminService.setOrganizationDeleted(
      organizationId,
      dto,
      currentUser,
    );
  }

  @Post(':organizationId/invites/:inviteId/revoke')
  @ApiOperation({
    operationId: 'adminOrganizationsRevokeInvite',
    summary: 'Revoke Organization Invite',
    description: 'Force revoke a pending organization invite by id.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Invite revoked successfully.',
  })
  revokeInvite(
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('inviteId', new ParseUUIDPipe()) inviteId: string,
    @CurrentUser() currentUser: AuthJwtPayload,
  ) {
    return this.organizationAdminService.revokeInviteByAdmin(
      organizationId,
      inviteId,
      currentUser,
    );
  }

  @Post(':organizationId/members/:memberUserId/revoke')
  @ApiOperation({
    operationId: 'adminOrganizationsRevokeMember',
    summary: 'Revoke Organization Member',
    description: 'Force deactivate a membership by user id.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Membership revoked successfully.',
  })
  revokeMember(
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('memberUserId', new ParseUUIDPipe()) memberUserId: string,
    @CurrentUser() currentUser: AuthJwtPayload,
  ) {
    return this.organizationAdminService.revokeMembershipByAdmin(
      organizationId,
      memberUserId,
      currentUser,
    );
  }

  @Get(':organizationId/invites')
  @ApiOperation({
    operationId: 'adminOrganizationsListInvites',
    summary: 'List Organization Invites',
    description: 'List all invites for an organization for admin inspection.',
  })
  @ApiOkResponse({
    type: OrganizationInvitesResponseDto,
    description: 'Organization invites returned successfully.',
  })
  listInvites(
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.organizationAdminService.listInvitesForAdmin(organizationId);
  }

  @Get(':organizationId/members')
  @ApiOperation({
    operationId: 'adminOrganizationsListMembers',
    summary: 'List Organization Members',
    description:
      'List all organization members (active and inactive) for admin inspection.',
  })
  @ApiOkResponse({
    type: OrganizationMembersResponseDto,
    description: 'Organization members returned successfully.',
  })
  listMembers(
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.organizationAdminService.listMembersForAdmin(organizationId);
  }

  @Post(':organizationId/restore')
  @ApiOperation({
    operationId: 'adminOrganizationsRestore',
    summary: 'Restore Organization',
    description:
      'Restore a soft-deleted organization and activate it for use again.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Organization restored successfully.',
  })
  restore(
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @CurrentUser() currentUser: AuthJwtPayload,
  ) {
    return this.organizationAdminService.restoreOrganization(
      organizationId,
      currentUser,
    );
  }
}
