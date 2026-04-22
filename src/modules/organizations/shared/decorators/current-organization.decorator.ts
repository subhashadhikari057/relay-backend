import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { OrganizationRequestContext } from '../interfaces/organization-request-context.interface';

type OrganizationAwareRequest = Request & {
  organization?: OrganizationRequestContext;
};

export const CurrentOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<OrganizationAwareRequest>();
    return request.organization;
  },
);
