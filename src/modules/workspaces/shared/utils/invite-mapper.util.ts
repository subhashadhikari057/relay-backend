import type { WorkspaceInvite } from '@prisma/client';
import { getWorkspaceInviteStatus } from './invite-status.util';

type InviteWithSender = WorkspaceInvite & {
  invitedBy: {
    id: string;
    fullName: string;
    displayName: string | null;
  };
};

export function toWorkspaceInviteDto(invite: InviteWithSender) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: getWorkspaceInviteStatus(invite),
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
    revokedAt: invite.revokedAt,
    createdAt: invite.createdAt,
    invitedById: invite.invitedBy.id,
    invitedByName: invite.invitedBy.displayName ?? invite.invitedBy.fullName,
  };
}
