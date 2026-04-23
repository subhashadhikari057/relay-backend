import { Body, Controller, Headers, Ip, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthTokenResponseDto } from '../shared/dto/auth-token-response.dto';
import { AuthCookieService } from '../shared/services/auth-cookie.service';
import { toAuthTokenResponse } from '../shared/utils/auth-response.util';
import { GoogleLoginMobileDto } from './dto/google-login-mobile.dto';
import { GoogleAuthService } from './services/google-auth.service';

@Controller('api/mobile/auth')
@ApiTags('Mobile Auth')
export class MobileGoogleAuthController {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('google')
  @ApiOperation({
    operationId: 'mobileAuthGoogleLogin',
    summary: 'Mobile Google Login',
    description:
      'Verify a Google ID token, create or link a Relay user by verified email, save Google avatar when useful, and issue the same access token plus refresh/session cookies used by local auth.',
  })
  @ApiBody({
    type: GoogleLoginMobileDto,
    description: 'Google ID token payload.',
  })
  @ApiOkResponse({
    type: AuthTokenResponseDto,
    description: 'Google account authenticated successfully.',
  })
  async loginWithGoogle(
    @Body() dto: GoogleLoginMobileDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.googleAuthService.loginWithGoogle(dto, {
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
}
