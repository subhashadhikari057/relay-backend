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
import { WorkspacePermissionResource } from '../constants/permission-resources.constant';
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

@Controller('api/mobile/workspaces/:workspaceId/permissions')
@ApiTags('Mobile Workspace Permissions')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class PermissionsMobileController {
  constructor(
    private readonly permissionsPolicyService: PermissionsPolicyService,
    private readonly permissionsUpdateOrchestrator: PermissionsUpdateOrchestratorService,
  ) {}

  @Get()
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.PERMISSIONS,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesPermissionsList',
    summary: 'List Workspace Policies',
    description:
      'List dynamic workspace role policies for the active workspace (owner-only access).',
  })
  @ApiOkResponse({
    type: PoliciesListResponseDto,
    description: 'Workspace policies returned successfully.',
  })
  async listWorkspacePolicies(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ) {
    await this.permissionsPolicyService.assertWorkspaceOwnerCanManagePolicies(
      currentUser.sub,
      workspaceId,
    );

    return this.permissionsPolicyService.listWorkspacePolicies(workspaceId);
  }

  @Patch()
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.PERMISSIONS,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesPermissionsUpdate',
    summary: 'Update Workspace Policy',
    description:
      'Update one workspace role policy mask in the active workspace (owner-only access).',
  })
  @ApiBody({
    type: UpdatePolicyDto,
    description: 'Single workspace policy update payload.',
  })
  @ApiOkResponse({
    type: UpdatePolicyResponseDto,
    description: 'Workspace policy updated successfully.',
  })
  async updateWorkspacePolicy(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    await this.permissionsPolicyService.assertWorkspaceOwnerCanManagePolicies(
      currentUser.sub,
      workspaceId,
    );

    const result = await this.permissionsUpdateOrchestrator.updateOne({
      scope: PermissionScope.workspace,
      workspaceId,
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
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.PERMISSIONS,
    action: PermissionAction.update,
  })
  @ApiOperation({
    operationId: 'mobileWorkspacesPermissionsBulkUpdate',
    summary: 'Bulk Update Workspace Policies',
    description:
      'Bulk update workspace role policy masks in the active workspace (owner-only access).',
  })
  @ApiBody({
    type: UpdatePoliciesBulkDto,
    description: 'Bulk workspace policy update payload.',
  })
  @ApiOkResponse({
    type: UpdatePoliciesBulkResponseDto,
    description: 'Workspace policies updated successfully.',
  })
  async bulkUpdateWorkspacePolicies(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: UpdatePoliciesBulkDto,
  ) {
    await this.permissionsPolicyService.assertWorkspaceOwnerCanManagePolicies(
      currentUser.sub,
      workspaceId,
    );

    const result = await this.permissionsUpdateOrchestrator.updateBulk({
      scope: PermissionScope.workspace,
      workspaceId,
      actor: currentUser,
      updates: dto.updates,
    });

    return { count: result.count };
  }
}
