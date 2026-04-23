import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { TokenVersionService } from 'src/modules/auth/shared/services/token-version.service';
import {
  hasPermissionBit,
  PermissionAction,
} from '../constants/permission-actions.constant';
import { PermissionScope } from '../constants/permission-scope.constant';
import {
  REQUIRE_PERMISSION_KEY,
  type RequiredPermissionMetadata,
} from '../decorators/require-permission.decorator';

type AuthenticatedRequest = Request & { user?: AuthJwtPayload };

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenVersionService: TokenVersionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<RequiredPermissionMetadata>(
        REQUIRE_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Permission check requires authentication');
    }

    const requestWithFlag = request as Request & {
      tokenVersionChecked?: boolean;
    };
    if (!requestWithFlag.tokenVersionChecked) {
      await this.tokenVersionService.assertTokenVersionOrThrow(
        user.sub,
        user.tokenVersion,
      );
      requestWithFlag.tokenVersionChecked = true;
    }

    const map = this.resolvePermissionMap(user, required.scope);
    const mask = map[required.resource] ?? 0;

    if (!hasPermissionBit(mask, required.action)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (required.scope === PermissionScope.workspace) {
      this.assertActiveWorkspaceMatchesRequest(user, request, required.action);
    }

    return true;
  }

  private resolvePermissionMap(
    user: AuthJwtPayload,
    scope: PermissionScope,
  ): Record<string, number> {
    if (scope === PermissionScope.platform) {
      return user.platformPermissions ?? {};
    }

    return user.workspacePermissions ?? {};
  }

  private assertActiveWorkspaceMatchesRequest(
    user: AuthJwtPayload,
    request: Request,
    action: PermissionAction,
  ) {
    const requestWorkspaceId = this.extractRequestWorkspaceId(request);
    if (!requestWorkspaceId) {
      return;
    }

    if (!user.activeWorkspaceId) {
      throw new ForbiddenException(
        'No active workspace selected. Switch workspace and try again.',
      );
    }

    if (user.activeWorkspaceId !== requestWorkspaceId) {
      throw new ForbiddenException(
        `Active workspace mismatch for ${action}. Switch active workspace first.`,
      );
    }
  }

  private extractRequestWorkspaceId(request: Request) {
    const raw = request.params?.workspaceId;
    if (typeof raw === 'string' && raw.length > 0) {
      return raw;
    }

    return undefined;
  }
}
