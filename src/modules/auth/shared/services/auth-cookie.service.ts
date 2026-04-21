import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
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
        ...this.getBaseCookieOptions(),
        maxAge: this.tokenService.getRefreshTokenMaxAgeMs(),
      },
    );
  }

  setSessionIdCookie(response: Response, sessionId: string) {
    response.cookie(
      this.configService.getOrThrow<string>('auth.sessionCookieName'),
      sessionId,
      {
        ...this.getBaseCookieOptions(),
        maxAge: this.tokenService.getRefreshTokenMaxAgeMs(),
      },
    );
  }

  clearRefreshTokenCookie(response: Response) {
    response.clearCookie(
      this.configService.getOrThrow<string>('auth.refreshCookieName'),
      this.getBaseCookieOptions(),
    );
  }

  clearSessionIdCookie(response: Response) {
    response.clearCookie(
      this.configService.getOrThrow<string>('auth.sessionCookieName'),
      this.getBaseCookieOptions(),
    );
  }

  getRefreshTokenFromCookies(cookies: Record<string, unknown> | undefined) {
    const cookieName = this.configService.getOrThrow<string>(
      'auth.refreshCookieName',
    );
    const token = cookies?.[cookieName];

    return typeof token === 'string' ? token : null;
  }

  getSessionIdFromCookies(cookies: Record<string, unknown> | undefined) {
    const cookieName = this.configService.getOrThrow<string>(
      'auth.sessionCookieName',
    );
    const token = cookies?.[cookieName];

    return typeof token === 'string' ? token : null;
  }

  setAuthCookies(response: Response, refreshToken: string, sessionId: string) {
    this.setRefreshTokenCookie(response, refreshToken);
    this.setSessionIdCookie(response, sessionId);
  }

  clearAuthCookies(response: Response) {
    this.clearRefreshTokenCookie(response);
    this.clearSessionIdCookie(response);
  }

  getRefreshCookiePairOrThrow(cookies: Record<string, unknown> | undefined) {
    const refreshToken = this.getRefreshTokenFromCookies(cookies);
    const sessionId = this.getSessionIdFromCookies(cookies);

    if (!refreshToken || !sessionId) {
      throw new UnauthorizedException('Missing refresh token or sid cookie');
    }

    return { refreshToken, sessionId };
  }

  private getBaseCookieOptions(): CookieOptions {
    const domain = this.configService.get<string>('auth.cookieDomain');

    return {
      httpOnly: true,
      sameSite: this.configService.getOrThrow<'lax' | 'strict' | 'none'>(
        'auth.cookieSameSite',
      ),
      secure: this.configService.getOrThrow<boolean>('auth.cookieSecure'),
      path: this.configService.getOrThrow<string>('auth.cookiePath'),
      ...(domain ? { domain } : {}),
    };
  }
}
