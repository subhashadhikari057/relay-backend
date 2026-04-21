import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationRole } from '@prisma/client';
import { Request } from 'express';
import { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { ORG_ROLES_KEY } from '../decorators/org-roles.decorator';
import { OrganizationRequestContext } from '../interfaces/organization-request-context.interface';
import { OrganizationPolicyService } from '../services/organization-policy.service';

type OrganizationAwareRequest = Request & {
  user?: AuthJwtPayload;
  organization?: OrganizationRequestContext;
};

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly organizationPolicyService: OrganizationPolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<OrganizationAwareRequest>();

    if (!request.user) {
      throw new ForbiddenException('Missing authenticated user context');
    }

    const organizationId = this.extractOrganizationId(request);
    const membership =
      await this.organizationPolicyService.resolveMembershipOrThrow(
        request.user.sub,
        organizationId,
      );

    request.organization =
      this.organizationPolicyService.toOrganizationContext(membership);

    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient organization role');
    }

    return true;
  }

  private extractOrganizationId(request: Request) {
    const organizationId = request.params.organizationId;
    const normalizedOrganizationId =
      typeof organizationId === 'string' ? organizationId : null;

    if (!normalizedOrganizationId) {
      throw new ForbiddenException('organizationId route param is required');
    }

    return normalizedOrganizationId;
  }
}
