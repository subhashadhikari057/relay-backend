import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { PermissionAction } from '../constants/permission-actions.constant';
import { OrganizationPermissionResource } from '../constants/permission-resources.constant';
import { PermissionScope } from '../constants/permission-scope.constant';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { PoliciesListResponseDto } from '../dto/policies-list-response.dto';
import { UpdatePoliciesBulkDto } from '../dto/update-policies-bulk.dto';
import { UpdatePoliciesBulkResponseDto } from '../dto/update-policies-bulk-response.dto';
import { UpdatePolicyDto } from '../dto/update-policy.dto';
import { UpdatePolicyResponseDto } from '../dto/update-policy-response.dto';
import { PermissionGuard } from '../guards/permission.guard';
import { PermissionsPolicyService } from '../services/permissions-policy.service';
import { PermissionsUpdateOrchestratorService } from '../services/permissions-update-orchestrator.service';

@Controller('api/mobile/organizations/:organizationId/permissions')
@ApiTags('Mobile Organization Permissions')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class PermissionsMobileController {
  constructor(
    private readonly permissionsPolicyService: PermissionsPolicyService,
    private readonly permissionsUpdateOrchestrator: PermissionsUpdateOrchestratorService,
  ) {}

  @Get()
  @RequirePermission({
    scope: PermissionScope.organization,
    resource: OrganizationPermissionResource.PERMISSIONS,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileOrganizationsPermissionsList',
    summary: 'List Organization Policies',
    description:
      'List dynamic organization role policies for the active organization (owner-only access).',
  })
  @ApiOkResponse({
    type: PoliciesListResponseDto,
    description: 'Organization policies returned successfully.',
  })
  async listOrganizationPolicies(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    await this.permissionsPolicyService.assertOrganizationOwnerCanManagePolicies(
      currentUser.sub,
      organizationId,
    );

    return this.permissionsPolicyService.listOrganizationPolicies(
      organizationId,
    );
  }

  @Patch()
  @RequirePermission({
    scope: PermissionScope.organization,
    resource: OrganizationPermissionResource.PERMISSIONS,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileOrganizationsPermissionsUpdate',
    summary: 'Update Organization Policy',
    description:
      'Update one organization role policy mask in the active organization (owner-only access).',
  })
  @ApiBody({
    type: UpdatePolicyDto,
    description: 'Single organization policy update payload.',
  })
  @ApiOkResponse({
    type: UpdatePolicyResponseDto,
    description: 'Organization policy updated successfully.',
  })
  async updateOrganizationPolicy(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    await this.permissionsPolicyService.assertOrganizationOwnerCanManagePolicies(
      currentUser.sub,
      organizationId,
    );

    const result = await this.permissionsUpdateOrchestrator.updateOne({
      scope: PermissionScope.organization,
      organizationId,
      actor: currentUser,
      role: dto.role,
      resource: dto.resource,
      mask: dto.mask,
    });

    return {
      change: {
        beforeMask: result.beforeMask,
        afterMask: result.afterMask,
      },
    };
  }

  @Patch('bulk')
  @RequirePermission({
    scope: PermissionScope.organization,
    resource: OrganizationPermissionResource.PERMISSIONS,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileOrganizationsPermissionsBulkUpdate',
    summary: 'Bulk Update Organization Policies',
    description:
      'Bulk update organization role policy masks in the active organization (owner-only access).',
  })
  @ApiBody({
    type: UpdatePoliciesBulkDto,
    description: 'Bulk organization policy update payload.',
  })
  @ApiOkResponse({
    type: UpdatePoliciesBulkResponseDto,
    description: 'Organization policies updated successfully.',
  })
  async bulkUpdateOrganizationPolicies(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Body() dto: UpdatePoliciesBulkDto,
  ) {
    await this.permissionsPolicyService.assertOrganizationOwnerCanManagePolicies(
      currentUser.sub,
      organizationId,
    );

    const result = await this.permissionsUpdateOrchestrator.updateBulk({
      scope: PermissionScope.organization,
      organizationId,
      actor: currentUser,
      updates: dto.updates,
    });

    return { count: result.count };
  }
}
