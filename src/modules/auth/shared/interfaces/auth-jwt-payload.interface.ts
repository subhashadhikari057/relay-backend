import { PlatformRole } from '@prisma/client';

export interface AuthJwtPayload {
  sub: string;
  email: string;
  platformRole: PlatformRole;
  sessionId: string;
}
