export function toAuthTokenResponse(result: {
  accessToken: string;
  user: unknown;
  activeWorkspaceId?: string | null;
  activeWorkspace?: unknown;
}) {
  return {
    accessToken: result.accessToken,
    user: result.user,
    activeWorkspaceId: result.activeWorkspaceId ?? null,
    activeWorkspace: result.activeWorkspace ?? null,
  };
}
