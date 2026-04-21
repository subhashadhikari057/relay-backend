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
import { PlatformRole } from '@prisma/client';
import { PlatformRoles } from 'src/modules/auth/shared/decorators/platform-roles.decorator';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import { PlatformRoleGuard } from 'src/modules/auth/shared/guards/platform-role.guard';
import { AdminAuditQueryDto } from '../dto/admin-audit-query.dto';
import { AdminAuditResponseDto } from '../dto/admin-audit-response.dto';
import { AuditService } from '../audit.service';

@Controller('api/admin/audit')
@ApiTags('Admin Audit')
@UseGuards(AccessTokenGuard, PlatformRoleGuard)
@PlatformRoles(PlatformRole.superadmin)
@ApiBearerAuth('bearer')
export class AuditAdminController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
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
