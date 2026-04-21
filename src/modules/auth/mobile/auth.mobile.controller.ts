import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  Req,
  Res,
  UnauthorizedException,
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
import { EmailVerificationConfirmResponseDto } from '../shared/dto/email-verification-confirm-response.dto';
import { EmailVerificationRequestResponseDto } from '../shared/dto/email-verification-request-response.dto';
import { LogoutResponseDto } from '../shared/dto/logout-response.dto';
import { AccessTokenGuard } from '../shared/guards/access-token.guard';
import type { AuthJwtPayload } from '../shared/interfaces/auth-jwt-payload.interface';
import { AuthCookieService } from '../shared/services/auth-cookie.service';
import { AuthService } from '../shared/services/auth.service';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { LoginMobileDto } from './dto/login-mobile.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { SignupMobileDto } from './dto/signup-mobile.dto';

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

    this.authCookieService.setRefreshTokenCookie(response, result.refreshToken);
    this.authCookieService.setSessionIdCookie(response, result.sessionId);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
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
    const result = await this.authService.login(dto, 'mobile', {
      deviceInfo: userAgent,
      ipAddress,
    });

    this.authCookieService.setRefreshTokenCookie(response, result.refreshToken);
    this.authCookieService.setSessionIdCookie(response, result.sessionId);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
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
    const refreshToken = this.authCookieService.getRefreshTokenFromCookies(
      request.cookies,
    );
    const sessionId = this.authCookieService.getSessionIdFromCookies(
      request.cookies,
    );

    if (!refreshToken || !sessionId) {
      throw new UnauthorizedException('Missing refresh token or sid cookie');
    }

    const result = await this.authService.refresh(
      sessionId,
      refreshToken,
      'mobile',
      {
        deviceInfo: userAgent,
        ipAddress,
      },
    );

    this.authCookieService.setRefreshTokenCookie(response, result.refreshToken);
    this.authCookieService.setSessionIdCookie(response, result.sessionId);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
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
    const sessionId = this.authCookieService.getSessionIdFromCookies(
      request.cookies,
    );

    if (sessionId) {
      await this.authService.logout(sessionId, 'mobile');
    }

    this.authCookieService.clearRefreshTokenCookie(response);
    this.authCookieService.clearSessionIdCookie(response);

    return { success: true };
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
}
