export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  auth: {
    refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'relay_refresh_token',
    emailVerificationTokenExpiresIn:
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN ?? '20m',
    emailVerificationUrlBase:
      process.env.EMAIL_VERIFICATION_URL_BASE ??
      'http://localhost:3000/verify-email',
  },
});
