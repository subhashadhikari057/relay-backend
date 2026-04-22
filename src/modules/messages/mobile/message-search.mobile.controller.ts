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
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { WorkspacePermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { SearchMessagesQueryDto } from './dto/search-messages-query.dto';
import { SearchMessagesResponseDto } from './dto/search-messages-response.dto';
import { MessageSearchService } from './services/message-search.service';

@ApiTags('Mobile Message Search')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
@Controller('api/mobile/workspaces/:workspaceId/messages')
export class MessageSearchMobileController {
  constructor(private readonly messageSearchService: MessageSearchService) {}

  @Get('search')
  @RequirePermission({
    scope: PermissionScope.workspace,
    resource: WorkspacePermissionResource.MESSAGES,
    action: PermissionAction.read,
  })
  @ApiOperation({
    operationId: 'mobileWorkspaceMessagesSearch',
    summary: 'Search Messages',
    description:
      'Search non-deleted message content across visible workspace channels, optionally limited to one channel.',
  })
  @ApiOkResponse({
    type: SearchMessagesResponseDto,
    description: 'Search results returned successfully.',
  })
  searchMessages(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Query() query: SearchMessagesQueryDto,
  ) {
    return this.messageSearchService.searchMessages(
      currentUser.sub,
      workspaceId,
      query,
    );
  }
}
