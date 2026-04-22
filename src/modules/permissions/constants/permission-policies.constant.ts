import { PermissionPolicyRole } from '@prisma/client';
import {
  ALL_PERMISSION_BITS,
  PermissionBits,
  PermissionAction,
} from './permission-actions.constant';
import {
  OrganizationPermissionResource,
  PlatformPermissionResource,
} from './permission-resources.constant';
import { PermissionScope } from './permission-scope.constant';

export type PermissionPolicyDefinition = {
  scope: PermissionScope;
  role: PermissionPolicyRole;
  resource: string;
  mask: number;
};

export const PROTECTED_SUPERADMIN_PLATFORM_PERMISSIONS_MIN_MASK =
  PermissionBits[PermissionAction.read] |
  PermissionBits[PermissionAction.update];

const noAccess = 0;

export const DEFAULT_PERMISSION_POLICIES: PermissionPolicyDefinition[] = [
  {
    scope: PermissionScope.platform,
    role: PermissionPolicyRole.superadmin,
    resource: PlatformPermissionResource.AUTH,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.platform,
    role: PermissionPolicyRole.superadmin,
    resource: PlatformPermissionResource.ORGANIZATIONS,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.platform,
    role: PermissionPolicyRole.superadmin,
    resource: PlatformPermissionResource.AUDIT,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.platform,
    role: PermissionPolicyRole.superadmin,
    resource: PlatformPermissionResource.UPLOAD,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.platform,
    role: PermissionPolicyRole.superadmin,
    resource: PlatformPermissionResource.PERMISSIONS,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.platform,
    role: PermissionPolicyRole.user,
    resource: PlatformPermissionResource.AUTH,
    mask: noAccess,
  },
  {
    scope: PermissionScope.platform,
    role: PermissionPolicyRole.user,
    resource: PlatformPermissionResource.ORGANIZATIONS,
    mask: noAccess,
  },
  {
    scope: PermissionScope.platform,
    role: PermissionPolicyRole.user,
    resource: PlatformPermissionResource.AUDIT,
    mask: noAccess,
  },
  {
    scope: PermissionScope.platform,
    role: PermissionPolicyRole.user,
    resource: PlatformPermissionResource.UPLOAD,
    mask: noAccess,
  },
  {
    scope: PermissionScope.platform,
    role: PermissionPolicyRole.user,
    resource: PlatformPermissionResource.PERMISSIONS,
    mask: noAccess,
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.owner,
    resource: OrganizationPermissionResource.ORGANIZATION,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.owner,
    resource: OrganizationPermissionResource.INVITES,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.owner,
    resource: OrganizationPermissionResource.MEMBERS,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.owner,
    resource: OrganizationPermissionResource.ACTIVITY,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.owner,
    resource: OrganizationPermissionResource.PERMISSIONS,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.admin,
    resource: OrganizationPermissionResource.ORGANIZATION,
    mask:
      PermissionBits[PermissionAction.read] |
      PermissionBits[PermissionAction.update],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.admin,
    resource: OrganizationPermissionResource.INVITES,
    mask:
      PermissionBits[PermissionAction.read] |
      PermissionBits[PermissionAction.write] |
      PermissionBits[PermissionAction.delete],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.admin,
    resource: OrganizationPermissionResource.MEMBERS,
    mask:
      PermissionBits[PermissionAction.read] |
      PermissionBits[PermissionAction.update] |
      PermissionBits[PermissionAction.delete],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.admin,
    resource: OrganizationPermissionResource.ACTIVITY,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.admin,
    resource: OrganizationPermissionResource.PERMISSIONS,
    mask: noAccess,
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.member,
    resource: OrganizationPermissionResource.ORGANIZATION,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.member,
    resource: OrganizationPermissionResource.INVITES,
    mask: noAccess,
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.member,
    resource: OrganizationPermissionResource.MEMBERS,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.member,
    resource: OrganizationPermissionResource.ACTIVITY,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.member,
    resource: OrganizationPermissionResource.PERMISSIONS,
    mask: noAccess,
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.guest,
    resource: OrganizationPermissionResource.ORGANIZATION,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.guest,
    resource: OrganizationPermissionResource.INVITES,
    mask: noAccess,
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.guest,
    resource: OrganizationPermissionResource.MEMBERS,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.guest,
    resource: OrganizationPermissionResource.ACTIVITY,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.organization,
    role: PermissionPolicyRole.guest,
    resource: OrganizationPermissionResource.PERMISSIONS,
    mask: noAccess,
  },
];

export const ORG_PERMISSION_RESOURCES = [
  OrganizationPermissionResource.ORGANIZATION,
  OrganizationPermissionResource.INVITES,
  OrganizationPermissionResource.MEMBERS,
  OrganizationPermissionResource.ACTIVITY,
  OrganizationPermissionResource.PERMISSIONS,
] as const;

export const PLATFORM_PERMISSION_RESOURCES = [
  PlatformPermissionResource.AUTH,
  PlatformPermissionResource.ORGANIZATIONS,
  PlatformPermissionResource.AUDIT,
  PlatformPermissionResource.UPLOAD,
  PlatformPermissionResource.PERMISSIONS,
] as const;
