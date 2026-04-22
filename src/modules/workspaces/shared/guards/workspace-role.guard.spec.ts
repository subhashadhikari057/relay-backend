import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';
import { WorkspaceRoleGuard } from './workspace-role.guard';

describe('WorkspaceRoleGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const policyService = {
    resolveMembershipOrThrow: jest.fn(),
    toWorkspaceContext: jest.fn(),
  };

  const guard = new WorkspaceRoleGuard(reflector, policyService as never);

  const context = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as never;

  beforeEach(() => {
    jest.resetAllMocks();
    reflector.getAllAndOverride = jest.fn();
    policyService.resolveMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.member,
      workspace: {
        id: 'org-1',
        name: 'Org',
        slug: 'org',
        description: null,
        avatarUrl: null,
      },
    });
    policyService.toWorkspaceContext.mockReturnValue({
      id: 'org-1',
      name: 'Org',
      slug: 'org',
      description: null,
      avatarUrl: null,
      role: WorkspaceRole.member,
    });
  });

  it('allows request with no role metadata', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    await expect(
      guard.canActivate(
        context({
          params: { workspaceId: 'org-1' },
          user: { sub: 'user-1' },
        }),
      ),
    ).resolves.toBe(true);
  });

  it('denies when membership role is not allowed', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      WorkspaceRole.owner,
    ]);

    await expect(
      guard.canActivate(
        context({
          params: { workspaceId: 'org-1' },
          user: { sub: 'user-1' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('bubbles not found from policy service for enumeration protection', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      WorkspaceRole.member,
    ]);
    policyService.resolveMembershipOrThrow.mockRejectedValueOnce(
      new NotFoundException('Workspace not found'),
    );

    await expect(
      guard.canActivate(
        context({
          params: { workspaceId: 'org-1' },
          user: { sub: 'user-1' },
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
