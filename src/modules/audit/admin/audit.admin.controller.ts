import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { PlatformPermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { AdminAuditQueryDto } from '../dto/admin-audit-query.dto';
import { AdminAuditResponseDto } from '../dto/admin-audit-response.dto';
import { AuditService } from '../audit.service';

@Controller('api/admin/audit')
@ApiTags('Admin Audit')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class AuditAdminController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.AUDIT,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'adminAuditListGlobal',
    summary: 'List Global Audit Events',
    description:
      'List global and organization audit events for superadmin with optional filters.',
  })
  @ApiOkResponse({
    type: AdminAuditResponseDto,
    description: 'Audit records returned successfully.',
  })
  listGlobal(@Query() query: AdminAuditQueryDto) {
    return this.auditService.listAdminAudit(query);
  }

  @Get('organizations/:organizationId')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.AUDIT,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'adminAuditListOrganization',
    summary: 'List Organization Audit Events',
    description:
      'List audit events for a specific organization, filtered further by optional query params.',
  })
  @ApiOkResponse({
    type: AdminAuditResponseDto,
    description: 'Organization audit records returned successfully.',
  })
  listForOrganization(
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Query() query: AdminAuditQueryDto,
  ) {
    return this.auditService.listAdminAudit(query, organizationId);
  }
}
