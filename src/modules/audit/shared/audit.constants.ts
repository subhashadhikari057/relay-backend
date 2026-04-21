export enum AuditAction {
  AUTH_LOGIN_SUCCEEDED = 'auth.login.succeeded',
  AUTH_LOGOUT_SUCCEEDED = 'auth.logout.succeeded',
  AUTH_REFRESH_FAILED = 'auth.refresh.failed',
  AUTH_EMAIL_VERIFIED = 'auth.email.verified',
  ORGANIZATION_CREATED = 'organization.created',
  ORGANIZATION_PROFILE_UPDATED = 'organization.profile.updated',
  ORGANIZATION_INVITE_CREATED = 'organization.invite.created',
  ORGANIZATION_INVITE_REVOKED = 'organization.invite.revoked',
  ORGANIZATION_INVITE_ACCEPTED = 'organization.invite.accepted',
  ORGANIZATION_MEMBER_ROLE_UPDATED = 'organization.member.role.updated',
  ORGANIZATION_MEMBER_REMOVED = 'organization.member.removed',
  ORGANIZATION_MEMBER_LEFT = 'organization.member.left',
  ORGANIZATION_OWNERSHIP_TRANSFERRED = 'organization.ownership.transferred',
  ORGANIZATION_STATUS_UPDATED = 'organization.status.updated',
  ORGANIZATION_SOFT_DELETE_UPDATED = 'organization.soft_delete.updated',
  ORGANIZATION_RESTORED = 'organization.restored',
  ORGANIZATION_INVITE_REVOKED_BY_ADMIN = 'organization.invite.revoked.by_admin',
  ORGANIZATION_MEMBER_REVOKED_BY_ADMIN = 'organization.member.revoked.by_admin',
}

export enum AuditEntityType {
  USER = 'user',
  SESSION = 'session',
  ORGANIZATION = 'organization',
  ORGANIZATION_INVITE = 'organization_invite',
  ORGANIZATION_MEMBER = 'organization_member',
}
