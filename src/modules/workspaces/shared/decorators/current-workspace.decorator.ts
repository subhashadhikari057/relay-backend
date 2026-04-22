import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { WorkspaceRequestContext } from '../interfaces/workspace-request-context.interface';

type WorkspaceAwareRequest = Request & {
  workspace?: WorkspaceRequestContext;
};

export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<WorkspaceAwareRequest>();
    return request.workspace;
  },
);
