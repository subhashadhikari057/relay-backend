import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';

type AuthenticatedRequest = Request & { user?: AuthJwtPayload };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
