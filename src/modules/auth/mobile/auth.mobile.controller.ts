import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
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
import { AuthSessionsResponseDto } from '../shared/dto/auth-sessions-response.dto';
import { EmailVerificationConfirmResponseDto } from '../shared/dto/email-verification-confirm-response.dto';
import { EmailVerificationRequestResponseDto } from '../shared/dto/email-verification-request-response.dto';
import { LogoutResponseDto } from '../shared/dto/logout-response.dto';
import { RevokeSessionsResponseDto } from '../shared/dto/revoke-sessions-response.dto';
import { SwitchActiveOrganizationResponseDto } from '../shared/dto/switch-active-organization-response.dto';
import { AccessTokenGuard } from '../shared/guards/access-token.guard';
import type { AuthJwtPayload } from '../shared/interfaces/auth-jwt-payload.interface';
import { AuthCookieService } from '../shared/services/auth-cookie.service';
import { AuthService } from '../shared/services/auth.service';
import { toAuthTokenResponse } from '../shared/utils/auth-response.util';
import {
  loginAndSetAuthCookies,
  logoutAndClearAuthCookies,
  refreshAndSetAuthCookies,
} from '../shared/utils/auth-controller.util';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { LoginMobileDto } from './dto/login-mobile.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { SignupMobileDto } from './dto/signup-mobile.dto';
import { SwitchActiveOrganizationDto } from './dto/switch-active-organization.dto';

@Controller('api/mobile/auth')
@ApiTags('Mobile Auth')
export class MobileAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('signup')
  @ApiOperation({
    operationId: 'mobileAuthSignup',
    summary: 'Mobile Signup',
    description:
      'Create a mobile user account and issue access token with refresh/session HttpOnly cookies.',
  })
  @ApiBody({ type: SignupMobileDto, description: 'Mobile signup payload.' })
  @ApiOkResponse({
    type: AuthTokenResponseDto,
    description: 'Mobile user created and authenticated successfully.',
  })
  async signup(
    @Body() dto: SignupMobileDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.signupMobile(dto, {
      deviceInfo: userAgent,
      ipAddress,
    });

    this.authCookieService.setAuthCookies(
      response,
      result.refreshToken,
      result.sessionId,
    );
    return toAuthTokenResponse(result);
  }

  @Post('login')
  @ApiOperation({
    operationId: 'mobileAuthLogin',
    summary: 'Mobile Login',
    description:
      'Authenticate a mobile user and issue access token with refresh/session HttpOnly cookies.',
  })
  @ApiBody({ type: LoginMobileDto, description: 'Mobile login credentials.' })
  @ApiOkResponse({
    type: AuthTokenResponseDto,
    description: 'Mobile user authenticated successfully.',
  })
  async login(
    @Body() dto: LoginMobileDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return loginAndSetAuthCookies(
      this.authService,
      this.authCookieService,
      'mobile',
      dto,
      { userAgent, ipAddress },
      response,
    );
  }

  @Post('refresh')
  @ApiOperation({
    operationId: 'mobileAuthRefresh',
    summary: 'Mobile Refresh Token',
    description:
      'Refresh mobile access token using HttpOnly refresh-token and sid cookies.',
  })
  @ApiCookieAuth('relay_refresh_token')
  @ApiCookieAuth('relay_sid')
  @ApiOkResponse({
    type: AuthTokenResponseDto,
    description: 'Mobile access token refreshed successfully.',
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
      'mobile',
      request,
      { userAgent, ipAddress },
      response,
    );
  }

  @Post('logout')
  @ApiOperation({
    operationId: 'mobileAuthLogout',
    summary: 'Mobile Logout',
    description:
      'Revoke active refresh session and clear refresh-token/sid cookies.',
  })
  @ApiCookieAuth('relay_sid')
  @ApiOkResponse({
    type: LogoutResponseDto,
    description: 'Mobile user logged out successfully.',
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return logoutAndClearAuthCookies(
      this.authService,
      this.authCookieService,
      'mobile',
      request,
      response,
    );
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    operationId: 'mobileAuthMe',
    summary: 'Get Mobile Profile',
    description: 'Return authenticated mobile user profile details.',
  })
  @ApiOkResponse({
    type: AuthUserResponseDto,
    description: 'Authenticated mobile user profile.',
  })
  me(@CurrentUser() currentUser: AuthJwtPayload) {
    return this.authService.getMe(currentUser.sub, 'mobile');
  }

  @Post('verify-email/request')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    operationId: 'mobileAuthRequestEmailVerification',
    summary: 'Request Email Verification',
    description:
      'Generate and send a one-time email verification link for authenticated mobile user.',
  })
  @ApiBody({
    type: RequestEmailVerificationDto,
    description: 'Verification request payload.',
  })
  @ApiOkResponse({
    type: EmailVerificationRequestResponseDto,
    description: 'Email verification request was accepted.',
  })
  requestEmailVerification(@CurrentUser() currentUser: AuthJwtPayload) {
    return this.authService.requestEmailVerification(currentUser.sub);
  }

  @Post('verify-email/confirm')
  @ApiOperation({
    operationId: 'mobileAuthConfirmEmailVerification',
    summary: 'Confirm Email Verification',
    description:
      'Confirm user email using one-time token from verification link.',
  })
  @ApiBody({
    type: ConfirmEmailVerificationDto,
    description: 'Verification token payload.',
  })
  @ApiOkResponse({
    type: EmailVerificationConfirmResponseDto,
    description: 'Email verification completed successfully.',
  })
  async confirmEmailVerification(@Body() dto: ConfirmEmailVerificationDto) {
    const result = await this.authService.confirmEmailVerification(dto.token);

    return {
      success: true,
      isEmailVerified: result.isEmailVerified,
      emailVerifiedAt: result.emailVerifiedAt,
    };
  }

  @Get('sessions')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    operationId: 'mobileAuthGetSessions',
    summary: 'Get Active Sessions',
    description:
      'List active sessions for the authenticated user with current-session marker.',
  })
  @ApiOkResponse({
    type: AuthSessionsResponseDto,
    description: 'Active sessions returned successfully.',
  })
  getSessions(@CurrentUser() currentUser: AuthJwtPayload) {
    return this.authService.getActiveSessions(
      currentUser.sub,
      'mobile',
      currentUser.sessionId,
    );
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    operationId: 'mobileAuthRevokeSession',
    summary: 'Revoke One Session',
    description: 'Revoke a specific active session for the authenticated user.',
  })
  @ApiOkResponse({
    type: LogoutResponseDto,
    description: 'Selected session revoked successfully.',
  })
  revokeOneSession(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.authService.revokeSingleSession(
      currentUser.sub,
      'mobile',
      currentUser.sessionId,
      sessionId,
    );
  }

  @Delete('sessions')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    operationId: 'mobileAuthRevokeOtherSessions',
    summary: 'Revoke Other Sessions',
    description:
      'Revoke all active sessions except the currently authenticated session.',
  })
  @ApiOkResponse({
    type: RevokeSessionsResponseDto,
    description: 'Other sessions revoked successfully.',
  })
  revokeOtherSessions(@CurrentUser() currentUser: AuthJwtPayload) {
    return this.authService.revokeOtherSessions(
      currentUser.sub,
      'mobile',
      currentUser.sessionId,
    );
  }

  @Post('active-organization')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    operationId: 'mobileAuthSwitchActiveOrganization',
    summary: 'Switch Active Organization',
    description:
      'Reissue access token with active organization permission map for selected organization.',
  })
  @ApiBody({
    type: SwitchActiveOrganizationDto,
    description: 'Active organization switch payload.',
  })
  @ApiOkResponse({
    type: SwitchActiveOrganizationResponseDto,
    description:
      'Active organization switched and token reissued successfully.',
  })
  async switchActiveOrganization(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Body() dto: SwitchActiveOrganizationDto,
  ) {
    const result = await this.authService.switchActiveOrganization(
      currentUser.sub,
      'mobile',
      currentUser.sessionId,
      dto.organizationId ?? null,
    );

    return {
      ...toAuthTokenResponse(result),
      activeOrganizationId: result.activeOrganizationId ?? null,
    };
  }
}
