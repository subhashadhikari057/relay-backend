export function toAuthTokenResponse(result: {
  accessToken: string;
  user: unknown;
  activeWorkspaceId?: string | null;
}) {
  return {
    accessToken: result.accessToken,
    user: result.user,
    activeWorkspaceId: result.activeWorkspaceId ?? null,
  };
}
