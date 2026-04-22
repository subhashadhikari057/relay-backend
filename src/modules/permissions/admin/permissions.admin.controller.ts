import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
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
import { PlatformPermissionResource } from '../constants/permission-resources.constant';
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

@Controller('api/admin/permissions/platform')
@ApiTags('Admin Permissions')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class PermissionsAdminController {
  constructor(
    private readonly permissionsPolicyService: PermissionsPolicyService,
    private readonly permissionsUpdateOrchestrator: PermissionsUpdateOrchestratorService,
  ) {}

  @Get()
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.PERMISSIONS,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'adminPermissionsListPlatformPolicies',
    summary: 'List Platform Policies',
    description: 'List dynamic platform role permission policies.',
  })
  @ApiOkResponse({
    type: PoliciesListResponseDto,
    description: 'Platform policies returned successfully.',
  })
  listPlatformPolicies() {
    return this.permissionsPolicyService.listPlatformPolicies();
  }

  @Patch()
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.PERMISSIONS,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'adminPermissionsUpdatePlatformPolicy',
    summary: 'Update Platform Policy',
    description: 'Update one platform policy bitmask entry.',
  })
  @ApiBody({
    type: UpdatePolicyDto,
    description: 'Single policy update payload.',
  })
  @ApiOkResponse({
    type: UpdatePolicyResponseDto,
    description: 'Platform policy updated successfully.',
  })
  async updatePlatformPolicy(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Body() dto: UpdatePolicyDto,
  ) {
    const result = await this.permissionsUpdateOrchestrator.updateOne({
      scope: PermissionScope.platform,
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
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.PERMISSIONS,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'adminPermissionsBulkUpdatePlatformPolicies',
    summary: 'Bulk Update Platform Policies',
    description: 'Bulk update multiple platform policy masks in one request.',
  })
  @ApiBody({
    type: UpdatePoliciesBulkDto,
    description: 'Bulk platform policy update payload.',
  })
  @ApiOkResponse({
    type: UpdatePoliciesBulkResponseDto,
    description: 'Platform policies updated successfully.',
  })
  async bulkUpdatePlatformPolicies(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Body() dto: UpdatePoliciesBulkDto,
  ) {
    const result = await this.permissionsUpdateOrchestrator.updateBulk({
      scope: PermissionScope.platform,
      actor: currentUser,
      updates: dto.updates,
    });

    return { count: result.count };
  }
}
