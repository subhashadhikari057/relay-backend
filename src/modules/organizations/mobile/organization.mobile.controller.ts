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
import { MobileOrganizationActivityQueryDto } from 'src/modules/audit/dto/mobile-organization-activity-query.dto';
import { MobileOrganizationActivityResponseDto } from 'src/modules/audit/dto/mobile-organization-activity-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { OrgRoles } from '../shared/decorators/org-roles.decorator';
import { BasicSuccessResponseDto } from '../shared/dto/basic-success-response.dto';
import { OrganizationInviteResponseDto } from '../shared/dto/organization-invite-response.dto';
import { OrganizationInvitesResponseDto } from '../shared/dto/organization-invites-response.dto';
import { OrganizationListResponseDto } from '../shared/dto/organization-list-response.dto';
import { OrganizationMembershipMeResponseDto } from '../shared/dto/organization-membership-me-response.dto';
import { OrganizationMembersResponseDto } from '../shared/dto/organization-members-response.dto';
import { OrganizationSummaryDto } from '../shared/dto/organization-summary.dto';
import { OrganizationTransferOwnershipResponseDto } from '../shared/dto/organization-transfer-ownership-response.dto';
import { OrganizationRoleGuard } from '../shared/guards/organization-role.guard';
import { OrganizationMobileService } from './organization.mobile.service';
import { AcceptOrganizationInviteDto } from './dto/accept-organization-invite.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteOrganizationMemberDto } from './dto/invite-organization-member.dto';
import { ListMyOrganizationsDto } from './dto/list-my-organizations.dto';
import { OrganizationInviteAcceptResponseDto } from './dto/organization-invite-accept-response.dto';
import { TransferOrganizationOwnershipDto } from './dto/transfer-organization-ownership.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationRole } from '@prisma/client';

@Controller('api/mobile/organizations')
@ApiTags('Mobile Organizations')
@UseGuards(AccessTokenGuard)
@ApiBearerAuth('bearer')
export class MobileOrganizationController {
  constructor(
    private readonly organizationMobileService: OrganizationMobileService,
  ) {}

  @Post()
  @ApiOperation({
    operationId: 'mobileOrganizationsCreate',
    summary: 'Create Organization',
    description:
      'Create an organization and automatically assign authenticated user as owner.',
  })
  @ApiBody({
    type: CreateOrganizationDto,
    description: 'Organization creation payload.',
  })
  @ApiOkResponse({
    type: OrganizationSummaryDto,
    description: 'Organization created successfully.',
  })
  create(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationMobileService.createOrganization(
      currentUser.sub,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    operationId: 'mobileOrganizationsListMine',
    summary: 'List My Organizations',
    description:
      'List active organizations where authenticated user has active membership.',
  })
  @ApiOkResponse({
    type: OrganizationListResponseDto,
    description: 'Organization list returned successfully.',
  })
  listMy(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Query() query: ListMyOrganizationsDto,
  ) {
    return this.organizationMobileService.listMyOrganizations(
      currentUser.sub,
      query,
    );
  }

  @Get('slug/:slug')
  @ApiOperation({
    operationId: 'mobileOrganizationsGetBySlug',
    summary: 'Get Organization By Slug',
    description: 'Get organization details by slug for current member.',
  })
  @ApiOkResponse({
    type: OrganizationSummaryDto,
    description: 'Organization details returned successfully.',
  })
  getBySlug(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('slug') slug: string,
  ) {
    return this.organizationMobileService.getOrganizationBySlugForMember(
      currentUser.sub,
      slug,
    );
  }

  @Get(':organizationId')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(
    OrganizationRole.owner,
    OrganizationRole.admin,
    OrganizationRole.member,
    OrganizationRole.guest,
  )
  @ApiOperation({
    operationId: 'mobileOrganizationsGetById',
    summary: 'Get Organization',
    description: 'Get organization details for current member.',
  })
  @ApiOkResponse({
    type: OrganizationSummaryDto,
    description: 'Organization details returned successfully.',
  })
  getById(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.organizationMobileService.getOrganizationByIdForMember(
      currentUser.sub,
      organizationId,
    );
  }

  @Patch(':organizationId')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(OrganizationRole.owner, OrganizationRole.admin)
  @ApiOperation({
    operationId: 'mobileOrganizationsUpdateProfile',
    summary: 'Update Organization Profile',
    description:
      'Update organization profile fields (name/description/avatar).',
  })
  @ApiBody({
    type: UpdateOrganizationDto,
    description: 'Organization update payload.',
  })
  @ApiOkResponse({
    type: OrganizationSummaryDto,
    description: 'Organization profile updated successfully.',
  })
  update(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationMobileService.updateOrganizationProfile(
      currentUser.sub,
      organizationId,
      dto,
    );
  }

  @Post(':organizationId/invites')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(OrganizationRole.owner, OrganizationRole.admin)
  @ApiOperation({
    operationId: 'mobileOrganizationsInviteMember',
    summary: 'Invite Member',
    description:
      'Create a one-time organization invite for target email and role.',
  })
  @ApiBody({
    type: InviteOrganizationMemberDto,
    description: 'Invite creation payload.',
  })
  @ApiOkResponse({
    type: OrganizationInviteResponseDto,
    description: 'Invite created successfully.',
  })
  invite(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() dto: InviteOrganizationMemberDto,
  ) {
    return this.organizationMobileService.inviteMember(
      currentUser,
      organizationId,
      dto,
    );
  }

  @Get(':organizationId/invites')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(OrganizationRole.owner, OrganizationRole.admin)
  @ApiOperation({
    operationId: 'mobileOrganizationsListInvites',
    summary: 'List Invites',
    description: 'List organization invites (owner/admin only).',
  })
  @ApiOkResponse({
    type: OrganizationInvitesResponseDto,
    description: 'Organization invites returned successfully.',
  })
  listInvites(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.organizationMobileService.listInvitesForMember(
      currentUser.sub,
      organizationId,
    );
  }

  @Delete(':organizationId/invites/:inviteId')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(OrganizationRole.owner, OrganizationRole.admin)
  @ApiOperation({
    operationId: 'mobileOrganizationsRevokeInvite',
    summary: 'Revoke Invite',
    description: 'Revoke pending invite in organization (owner/admin only).',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Invite revoked successfully.',
  })
  revokeInvite(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('inviteId', new ParseUUIDPipe()) inviteId: string,
  ) {
    return this.organizationMobileService.revokeInviteForMember(
      currentUser.sub,
      organizationId,
      inviteId,
    );
  }

  @Post('invites/accept')
  @ApiOperation({
    operationId: 'mobileOrganizationsAcceptInvite',
    summary: 'Accept Invite',
    description:
      'Accept organization invite token for currently authenticated user.',
  })
  @ApiBody({
    type: AcceptOrganizationInviteDto,
    description: 'Invite acceptance payload.',
  })
  @ApiOkResponse({
    type: OrganizationInviteAcceptResponseDto,
    description: 'Invite accepted successfully.',
  })
  acceptInvite(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Body() dto: AcceptOrganizationInviteDto,
  ) {
    return this.organizationMobileService.acceptInvite(currentUser, dto.token);
  }

  @Get(':organizationId/members')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(
    OrganizationRole.owner,
    OrganizationRole.admin,
    OrganizationRole.member,
    OrganizationRole.guest,
  )
  @ApiOperation({
    operationId: 'mobileOrganizationsListMembers',
    summary: 'List Members',
    description: 'List active organization members for current member.',
  })
  @ApiOkResponse({
    type: OrganizationMembersResponseDto,
    description: 'Organization members returned successfully.',
  })
  listMembers(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.organizationMobileService.listMembers(
      currentUser.sub,
      organizationId,
    );
  }

  @Get(':organizationId/me')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(
    OrganizationRole.owner,
    OrganizationRole.admin,
    OrganizationRole.member,
    OrganizationRole.guest,
  )
  @ApiOperation({
    operationId: 'mobileOrganizationsMe',
    summary: 'Get Organization Me',
    description:
      'Get membership and permissions for current user in organization.',
  })
  @ApiOkResponse({
    type: OrganizationMembershipMeResponseDto,
    description: 'Organization membership details returned successfully.',
  })
  meInOrganization(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.organizationMobileService.getMyMembership(
      currentUser.sub,
      organizationId,
    );
  }

  @Get(':organizationId/activity')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(
    OrganizationRole.owner,
    OrganizationRole.admin,
    OrganizationRole.member,
    OrganizationRole.guest,
  )
  @ApiOperation({
    operationId: 'mobileOrganizationsActivity',
    summary: 'Get Organization Activity',
    description: 'Get recent organization activity timeline.',
  })
  @ApiOkResponse({
    type: MobileOrganizationActivityResponseDto,
    description: 'Organization activity returned successfully.',
  })
  activity(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Query() query: MobileOrganizationActivityQueryDto,
  ) {
    return this.organizationMobileService.getOrganizationActivity(
      currentUser.sub,
      organizationId,
      query,
    );
  }

  @Patch(':organizationId/members/:memberUserId/role')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(OrganizationRole.owner, OrganizationRole.admin)
  @ApiOperation({
    operationId: 'mobileOrganizationsUpdateMemberRole',
    summary: 'Update Member Role',
    description: 'Update role for a specific organization member.',
  })
  @ApiBody({
    type: UpdateOrganizationMemberRoleDto,
    description: 'Role update payload.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Member role updated successfully.',
  })
  updateMemberRole(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('memberUserId', new ParseUUIDPipe()) memberUserId: string,
    @Body() dto: UpdateOrganizationMemberRoleDto,
  ) {
    return this.organizationMobileService.updateMemberRole(
      currentUser.sub,
      organizationId,
      memberUserId,
      dto,
    );
  }

  @Delete(':organizationId/members/:memberUserId')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(OrganizationRole.owner, OrganizationRole.admin)
  @ApiOperation({
    operationId: 'mobileOrganizationsRemoveMember',
    summary: 'Remove Member',
    description: 'Deactivate target member from organization.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Member removed successfully.',
  })
  removeMember(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('memberUserId', new ParseUUIDPipe()) memberUserId: string,
  ) {
    return this.organizationMobileService.removeMember(
      currentUser.sub,
      organizationId,
      memberUserId,
    );
  }

  @Post(':organizationId/transfer-ownership')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(OrganizationRole.owner)
  @ApiOperation({
    operationId: 'mobileOrganizationsTransferOwnership',
    summary: 'Transfer Ownership',
    description:
      'Transfer organization ownership from current owner to another member.',
  })
  @ApiBody({
    type: TransferOrganizationOwnershipDto,
    description: 'Ownership transfer payload.',
  })
  @ApiOkResponse({
    type: OrganizationTransferOwnershipResponseDto,
    description: 'Organization ownership transferred successfully.',
  })
  transferOwnership(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() dto: TransferOrganizationOwnershipDto,
  ) {
    return this.organizationMobileService.transferOwnership(
      currentUser.sub,
      organizationId,
      dto,
    );
  }

  @Post(':organizationId/leave')
  @UseGuards(OrganizationRoleGuard)
  @OrgRoles(
    OrganizationRole.owner,
    OrganizationRole.admin,
    OrganizationRole.member,
    OrganizationRole.guest,
  )
  @ApiOperation({
    operationId: 'mobileOrganizationsLeave',
    summary: 'Leave Organization',
    description: 'Leave organization for current authenticated member.',
  })
  @ApiOkResponse({
    type: BasicSuccessResponseDto,
    description: 'Organization left successfully.',
  })
  leave(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.organizationMobileService.leaveOrganization(
      currentUser.sub,
      organizationId,
    );
  }
}
