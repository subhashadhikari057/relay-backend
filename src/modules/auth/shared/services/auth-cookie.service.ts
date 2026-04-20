import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { TokenService } from './token.service';

@Injectable()
export class AuthCookieService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {}

  setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie(
      this.configService.getOrThrow<string>('auth.refreshCookieName'),
      refreshToken,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure:
          this.configService.getOrThrow<string>('nodeEnv') === 'production',
        path: '/api',
        maxAge: this.tokenService.getRefreshTokenMaxAgeMs(),
      },
    );
  }

  clearRefreshTokenCookie(response: Response) {
    response.clearCookie(
      this.configService.getOrThrow<string>('auth.refreshCookieName'),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure:
          this.configService.getOrThrow<string>('nodeEnv') === 'production',
        path: '/api',
      },
    );
  }

  getRefreshTokenFromCookies(cookies: Record<string, unknown> | undefined) {
    const cookieName = this.configService.getOrThrow<string>(
      'auth.refreshCookieName',
    );
    const token = cookies?.[cookieName];

    return typeof token === 'string' ? token : null;
  }
}
