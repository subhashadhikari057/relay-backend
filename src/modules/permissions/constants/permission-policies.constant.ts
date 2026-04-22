import { PermissionPolicyRole } from '@prisma/client';
import {
  ALL_PERMISSION_BITS,
  PermissionBits,
  PermissionAction,
} from './permission-actions.constant';
import {
  WorkspacePermissionResource,
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
    resource: PlatformPermissionResource.WORKSPACES,
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
    resource: PlatformPermissionResource.WORKSPACES,
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
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.owner,
    resource: WorkspacePermissionResource.WORKSPACE,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.owner,
    resource: WorkspacePermissionResource.INVITES,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.owner,
    resource: WorkspacePermissionResource.MEMBERS,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.owner,
    resource: WorkspacePermissionResource.ACTIVITY,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.owner,
    resource: WorkspacePermissionResource.PERMISSIONS,
    mask: ALL_PERMISSION_BITS,
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.admin,
    resource: WorkspacePermissionResource.WORKSPACE,
    mask:
      PermissionBits[PermissionAction.read] |
      PermissionBits[PermissionAction.update],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.admin,
    resource: WorkspacePermissionResource.INVITES,
    mask:
      PermissionBits[PermissionAction.read] |
      PermissionBits[PermissionAction.write] |
      PermissionBits[PermissionAction.delete],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.admin,
    resource: WorkspacePermissionResource.MEMBERS,
    mask:
      PermissionBits[PermissionAction.read] |
      PermissionBits[PermissionAction.update] |
      PermissionBits[PermissionAction.delete],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.admin,
    resource: WorkspacePermissionResource.ACTIVITY,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.admin,
    resource: WorkspacePermissionResource.PERMISSIONS,
    mask: noAccess,
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.member,
    resource: WorkspacePermissionResource.WORKSPACE,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.member,
    resource: WorkspacePermissionResource.INVITES,
    mask: noAccess,
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.member,
    resource: WorkspacePermissionResource.MEMBERS,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.member,
    resource: WorkspacePermissionResource.ACTIVITY,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.member,
    resource: WorkspacePermissionResource.PERMISSIONS,
    mask: noAccess,
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.guest,
    resource: WorkspacePermissionResource.WORKSPACE,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.guest,
    resource: WorkspacePermissionResource.INVITES,
    mask: noAccess,
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.guest,
    resource: WorkspacePermissionResource.MEMBERS,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.guest,
    resource: WorkspacePermissionResource.ACTIVITY,
    mask: PermissionBits[PermissionAction.read],
  },
  {
    scope: PermissionScope.workspace,
    role: PermissionPolicyRole.guest,
    resource: WorkspacePermissionResource.PERMISSIONS,
    mask: noAccess,
  },
];

export const WORKSPACE_PERMISSION_RESOURCES = [
  WorkspacePermissionResource.WORKSPACE,
  WorkspacePermissionResource.INVITES,
  WorkspacePermissionResource.MEMBERS,
  WorkspacePermissionResource.ACTIVITY,
  WorkspacePermissionResource.PERMISSIONS,
] as const;

export const PLATFORM_PERMISSION_RESOURCES = [
  PlatformPermissionResource.AUTH,
  PlatformPermissionResource.WORKSPACES,
  PlatformPermissionResource.AUDIT,
  PlatformPermissionResource.UPLOAD,
  PlatformPermissionResource.PERMISSIONS,
] as const;
