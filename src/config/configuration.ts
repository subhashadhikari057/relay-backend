export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    privateKeyBase64: process.env.JWT_PRIVATE_KEY_BASE64,
    publicKeyBase64: process.env.JWT_PUBLIC_KEY_BASE64,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  auth: {
    refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'relay_refresh_token',
    sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'relay_sid',
    cookieSameSite: process.env.AUTH_COOKIE_SAME_SITE ?? 'lax',
    cookieSecure:
      process.env.AUTH_COOKIE_SECURE !== undefined
        ? process.env.AUTH_COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production',
    cookiePath: process.env.AUTH_COOKIE_PATH ?? '/api',
    cookieDomain: process.env.AUTH_COOKIE_DOMAIN,
    maxActiveSessionsPerUser: parseInt(
      process.env.AUTH_MAX_ACTIVE_SESSIONS_PER_USER ?? '0',
      10,
    ),
    sessionTouchIntervalSeconds: parseInt(
      process.env.AUTH_SESSION_TOUCH_INTERVAL_SECONDS ?? '300',
      10,
    ),
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    emailVerificationTokenExpiresIn:
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN ?? '20m',
    emailVerificationUrlBase:
      process.env.EMAIL_VERIFICATION_URL_BASE ??
      'http://localhost:3000/verify-email',
  },
  upload: {
    localRoot: process.env.UPLOAD_LOCAL_ROOT ?? 'uploads',
    enableScan: process.env.UPLOAD_ENABLE_SCAN === 'true',
  },
  messages: {
    editWindowMinutes: parseInt(
      process.env.MESSAGE_EDIT_WINDOW_MINUTES ?? '30',
      10,
    ),
  },
});
