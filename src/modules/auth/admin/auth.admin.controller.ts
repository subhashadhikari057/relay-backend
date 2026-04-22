import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthTokenResponseDto } from '../shared/dto/auth-token-response.dto';
import { AuthUserResponseDto } from '../shared/dto/auth-user-response.dto';
import { LogoutResponseDto } from '../shared/dto/logout-response.dto';
import { AccessTokenGuard } from '../shared/guards/access-token.guard';
import type { AuthJwtPayload } from '../shared/interfaces/auth-jwt-payload.interface';
import { AuthCookieService } from '../shared/services/auth-cookie.service';
import { AuthService } from '../shared/services/auth.service';
import {
  loginAndSetAuthCookies,
  logoutAndClearAuthCookies,
  refreshAndSetAuthCookies,
} from '../shared/utils/auth-controller.util';
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { PlatformPermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { LoginAdminDto } from './dto/login-admin.dto';

@Controller('api/admin/auth')
@ApiTags('Admin Auth')
export class AdminAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('login')
  @ApiOperation({
    operationId: 'adminAuthLogin',
    summary: 'Admin Login',
    description:
      'Authenticate a superadmin and issue access token with refresh/session HttpOnly cookies.',
  })
  @ApiBody({ type: LoginAdminDto, description: 'Admin login credentials.' })
  @ApiOkResponse({
    type: AuthTokenResponseDto,
    description: 'Admin authenticated successfully.',
  })
  async login(
    @Body() dto: LoginAdminDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return loginAndSetAuthCookies(
      this.authService,
      this.authCookieService,
      'admin',
      dto,
      { userAgent, ipAddress },
      response,
    );
  }

  @Post('refresh')
  @ApiOperation({
    operationId: 'adminAuthRefresh',
    summary: 'Admin Refresh Token',
    description:
      'Refresh admin access token using HttpOnly refresh-token and sid cookies.',
  })
  @ApiCookieAuth('relay_refresh_token')
  @ApiCookieAuth('relay_sid')
  @ApiOkResponse({
    type: AuthTokenResponseDto,
    description: 'Admin access token refreshed successfully.',
  })
  async refresh(
    @Req() request: Request,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return refreshAndSetAuthCookies(
      this.authService,
      this.authCookieService,
      'admin',
      request,
      { userAgent, ipAddress },
      response,
    );
  }

  @Post('logout')
  @ApiOperation({
    operationId: 'adminAuthLogout',
    summary: 'Admin Logout',
    description:
      'Revoke active refresh session and clear refresh-token/sid cookies.',
  })
  @ApiCookieAuth('relay_sid')
  @ApiOkResponse({
    type: LogoutResponseDto,
    description: 'Admin logged out successfully.',
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return logoutAndClearAuthCookies(
      this.authService,
      this.authCookieService,
      'admin',
      request,
      response,
    );
  }

  @Get('me')
  @UseGuards(AccessTokenGuard, PermissionGuard)
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.AUTH,
    action: PermissionAction.read,
  })
  @ApiBearerAuth('bearer')
  @ApiOperation({
    operationId: 'adminAuthMe',
    summary: 'Get Admin Profile',
    description: 'Return authenticated superadmin profile details.',
  })
  @ApiOkResponse({
    type: AuthUserResponseDto,
    description: 'Authenticated superadmin profile.',
  })
  me(@CurrentUser() currentUser: AuthJwtPayload) {
    return this.authService.getMe(currentUser.sub, 'admin');
  }
}
