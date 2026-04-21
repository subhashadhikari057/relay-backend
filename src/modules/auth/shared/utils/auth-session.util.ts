import type { Request } from 'express';
import type { AuthAudience } from '../services/auth.service';
import { AuthService } from '../services/auth.service';
import { AuthCookieService } from '../services/auth-cookie.service';

export async function revokeSessionFromCookieIfPresent(
  request: Request,
  audience: AuthAudience,
  authService: AuthService,
  authCookieService: AuthCookieService,
) {
  const sessionId = authCookieService.getSessionIdFromCookies(request.cookies);

  if (sessionId) {
    await authService.logout(sessionId, audience);
  }
}
