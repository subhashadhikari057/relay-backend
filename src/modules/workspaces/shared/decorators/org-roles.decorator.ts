import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';

export const ORG_ROLES_KEY = 'workspace_roles';

export const OrgRoles = (...roles: WorkspaceRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);
