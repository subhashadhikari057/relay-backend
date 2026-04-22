import { PlatformRole } from '@prisma/client';

export interface AuthJwtPayload {
  sub: string;
  email: string;
  platformRole: PlatformRole;
  sessionId: string;
  platformPermissions: Record<string, number>;
  activeWorkspaceId?: string;
  workspacePermissions?: Record<string, number>;
  permissionsVersion?: number;
  tokenVersion: number;
}
