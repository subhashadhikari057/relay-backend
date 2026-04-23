import type { WorkspaceInvite } from '@prisma/client';

export type WorkspaceInviteStatus =
  | 'pending'
  | 'accepted'
  | 'revoked'
  | 'expired';

export function getWorkspaceInviteStatus(
  invite: Pick<WorkspaceInvite, 'acceptedAt' | 'revokedAt' | 'expiresAt'>,
): WorkspaceInviteStatus {
  if (invite.acceptedAt) return 'accepted';
  if (invite.revokedAt) return 'revoked';
  if (invite.expiresAt <= new Date()) return 'expired';
  return 'pending';
}
