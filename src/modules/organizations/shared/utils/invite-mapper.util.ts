import type { OrganizationInvite } from '@prisma/client';
import { getOrganizationInviteStatus } from './invite-status.util';

type InviteWithSender = OrganizationInvite & {
  invitedBy: {
    id: string;
    fullName: string;
    displayName: string | null;
  };
};

export function toOrganizationInviteDto(invite: InviteWithSender) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: getOrganizationInviteStatus(invite),
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
    revokedAt: invite.revokedAt,
    createdAt: invite.createdAt,
    invitedById: invite.invitedBy.id,
    invitedByName: invite.invitedBy.displayName ?? invite.invitedBy.fullName,
  };
}
