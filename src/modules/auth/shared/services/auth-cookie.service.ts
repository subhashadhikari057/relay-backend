import { Injectable } from '@nestjs/common';
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
