import { WorkspaceRole } from '@prisma/client';

export type WorkspaceRequestContext = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  role: WorkspaceRole;
};
