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
import { LoginMobileDto } from './dto/login-mobile.dto';
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
      'Create a mobile user account and issue access/refresh tokens.',
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

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('login')
  @ApiOperation({
    operationId: 'mobileAuthLogin',
    summary: 'Mobile Login',
    description: 'Authenticate a mobile user and issue access/refresh tokens.',
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
      'Refresh mobile access token using HttpOnly refresh-token cookie.',
  })
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

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token cookie');
    }

    const result = await this.authService.refresh(refreshToken, 'mobile', {
      deviceInfo: userAgent,
      ipAddress,
    });

    this.authCookieService.setRefreshTokenCookie(response, result.refreshToken);

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
      'Revoke active refresh session and clear refresh-token cookie.',
  })
  @ApiOkResponse({
    type: LogoutResponseDto,
    description: 'Mobile user logged out successfully.',
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.authCookieService.getRefreshTokenFromCookies(
      request.cookies,
    );

    if (refreshToken) {
      await this.authService.logout(refreshToken, 'mobile');
    }

    this.authCookieService.clearRefreshTokenCookie(response);

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
}
