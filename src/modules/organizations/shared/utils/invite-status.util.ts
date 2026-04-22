import type { OrganizationInvite } from '@prisma/client';

export type OrganizationInviteStatus =
  | 'pending'
  | 'accepted'
  | 'revoked'
  | 'expired';

export function getOrganizationInviteStatus(
  invite: Pick<OrganizationInvite, 'acceptedAt' | 'revokedAt' | 'expiresAt'>,
): OrganizationInviteStatus {
  if (invite.acceptedAt) return 'accepted';
  if (invite.revokedAt) return 'revoked';
  if (invite.expiresAt <= new Date()) return 'expired';
  return 'pending';
}
