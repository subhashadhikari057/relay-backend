import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationRole } from '@prisma/client';
import { OrganizationRoleGuard } from './organization-role.guard';

describe('OrganizationRoleGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const policyService = {
    resolveMembershipOrThrow: jest.fn(),
    toOrganizationContext: jest.fn(),
  };

  const guard = new OrganizationRoleGuard(reflector, policyService as never);

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
      role: OrganizationRole.member,
      organization: {
        id: 'org-1',
        name: 'Org',
        slug: 'org',
        description: null,
        avatarUrl: null,
      },
    });
    policyService.toOrganizationContext.mockReturnValue({
      id: 'org-1',
      name: 'Org',
      slug: 'org',
      description: null,
      avatarUrl: null,
      role: OrganizationRole.member,
    });
  });

  it('allows request with no role metadata', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    await expect(
      guard.canActivate(
        context({
          params: { organizationId: 'org-1' },
          user: { sub: 'user-1' },
        }),
      ),
    ).resolves.toBe(true);
  });

  it('denies when membership role is not allowed', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      OrganizationRole.owner,
    ]);

    await expect(
      guard.canActivate(
        context({
          params: { organizationId: 'org-1' },
          user: { sub: 'user-1' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('bubbles not found from policy service for enumeration protection', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      OrganizationRole.member,
    ]);
    policyService.resolveMembershipOrThrow.mockRejectedValueOnce(
      new NotFoundException('Organization not found'),
    );

    await expect(
      guard.canActivate(
        context({
          params: { organizationId: 'org-1' },
          user: { sub: 'user-1' },
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
