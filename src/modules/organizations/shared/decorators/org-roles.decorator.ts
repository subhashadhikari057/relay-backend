import { SetMetadata } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';

export const ORG_ROLES_KEY = 'organization_roles';

export const OrgRoles = (...roles: OrganizationRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);
