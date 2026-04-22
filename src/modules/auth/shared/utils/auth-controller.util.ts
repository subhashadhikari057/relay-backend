import type { Request, Response } from 'express';
import type { AuthAudience } from '../services/auth.service';
import { AuthCookieService } from '../services/auth-cookie.service';
import { AuthService } from '../services/auth.service';
import { toAuthTokenResponse } from './auth-response.util';
import { revokeSessionFromCookieIfPresent } from './auth-session.util';

type AuthRequestContext = {
  userAgent?: string;
  ipAddress: string;
};

export async function loginAndSetAuthCookies(
  authService: AuthService,
  authCookieService: AuthCookieService,
  audience: AuthAudience,
  dto: { email: string; password: string },
  context: AuthRequestContext,
  response: Response,
) {
  const result = await authService.login(dto, audience, {
    deviceInfo: context.userAgent,
    ipAddress: context.ipAddress,
  });

  authCookieService.setAuthCookies(
    response,
    result.refreshToken,
    result.sessionId,
  );
  return toAuthTokenResponse(result);
}

export async function refreshAndSetAuthCookies(
  authService: AuthService,
  authCookieService: AuthCookieService,
  audience: AuthAudience,
  request: Request,
  context: AuthRequestContext,
  response: Response,
) {
  const { refreshToken, sessionId } =
    authCookieService.getRefreshCookiePairOrThrow(request.cookies);

  const result = await authService.refresh(sessionId, refreshToken, audience, {
    deviceInfo: context.userAgent,
    ipAddress: context.ipAddress,
  });

  authCookieService.setAuthCookies(
    response,
    result.refreshToken,
    result.sessionId,
  );
  return toAuthTokenResponse(result);
}

export async function logoutAndClearAuthCookies(
  authService: AuthService,
  authCookieService: AuthCookieService,
  audience: AuthAudience,
  request: Request,
  response: Response,
) {
  await revokeSessionFromCookieIfPresent(
    request,
    audience,
    authService,
    authCookieService,
  );

  authCookieService.clearAuthCookies(response);
  return { success: true };
}
