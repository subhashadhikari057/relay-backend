import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';
import { Request } from 'express';
import { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { ORG_ROLES_KEY } from '../decorators/org-roles.decorator';
import { WorkspaceRequestContext } from '../interfaces/workspace-request-context.interface';
import { WorkspacePolicyService } from '../services/workspace-policy.service';

type WorkspaceAwareRequest = Request & {
  user?: AuthJwtPayload;
  workspace?: WorkspaceRequestContext;
};

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspacePolicyService: WorkspacePolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkspaceAwareRequest>();

    if (!request.user) {
      throw new ForbiddenException('Missing authenticated user context');
    }

    const workspaceId = this.extractWorkspaceId(request);
    const membership =
      await this.workspacePolicyService.resolveMembershipOrThrow(
        request.user.sub,
        workspaceId,
      );

    request.workspace =
      this.workspacePolicyService.toWorkspaceContext(membership);

    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient workspace role');
    }

    return true;
  }

  private extractWorkspaceId(request: Request) {
    const workspaceId = request.params.workspaceId;
    const normalizedWorkspaceId =
      typeof workspaceId === 'string' ? workspaceId : null;

    if (!normalizedWorkspaceId) {
      throw new ForbiddenException('workspaceId route param is required');
    }

    return normalizedWorkspaceId;
  }
}
