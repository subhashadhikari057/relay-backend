export function toAuthTokenResponse(result: {
  accessToken: string;
  user: unknown;
  activeWorkspaceId?: string | null;
  activeWorkspace?: unknown;
  requiresOnboarding?: boolean;
}) {
  const activeWorkspace = result.activeWorkspace ?? null;

  return {
    accessToken: result.accessToken,
    user: result.user,
    activeWorkspaceId: result.activeWorkspaceId ?? null,
    activeWorkspace,
    requiresOnboarding: result.requiresOnboarding ?? !activeWorkspace,
  };
}
