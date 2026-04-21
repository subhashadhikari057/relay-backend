import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { AuditService } from '../audit.service';
import { MobileMyAuditQueryDto } from '../dto/mobile-my-audit-query.dto';
import { MobileMyAuditResponseDto } from '../dto/mobile-my-audit-response.dto';

@Controller('api/mobile/audit')
@ApiTags('Mobile Audit')
@UseGuards(AccessTokenGuard)
@ApiBearerAuth('bearer')
export class AuditMobileController {
  constructor(private readonly auditService: AuditService) {}

  @Get('me')
  @ApiOperation({
    operationId: 'mobileAuditMe',
    summary: 'List My Audit Events',
    description:
      'Return audit events performed by the authenticated user, with optional filters and pagination.',
  })
  @ApiOkResponse({
    type: MobileMyAuditResponseDto,
    description: 'Authenticated user audit records returned successfully.',
  })
  listMyAudit(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Query() query: MobileMyAuditQueryDto,
  ) {
    return this.auditService.listMyAudit(currentUser.sub, query);
  }
}
