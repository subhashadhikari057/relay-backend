import { OrganizationRole } from '@prisma/client';

export type OrganizationRequestContext = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  role: OrganizationRole;
};
