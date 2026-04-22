export function toAuthTokenResponse(result: {
  accessToken: string;
  user: unknown;
}) {
  return {
    accessToken: result.accessToken,
    user: result.user,
  };
}
