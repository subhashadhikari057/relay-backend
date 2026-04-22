import { ConflictException, ForbiddenException } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { OrganizationPolicyService } from './organization-policy.service';

describe('OrganizationPolicyService', () => {
  const prisma = {
    organizationMember: {
      count: jest.fn(),
    },
  };

  let service: OrganizationPolicyService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new OrganizationPolicyService(prisma as never);
  });

  it('allows owner to invite admin', () => {
    expect(() =>
      service.assertCanInviteRole(
        OrganizationRole.owner,
        OrganizationRole.admin,
      ),
    ).not.toThrow();
  });

  it('blocks admin from inviting admin', () => {
    expect(() =>
      service.assertCanInviteRole(
        OrganizationRole.admin,
        OrganizationRole.admin,
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks guest from sending invites', () => {
    expect(() =>
      service.assertCanInviteRole(
        OrganizationRole.guest,
        OrganizationRole.member,
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks role update when admin tries to promote to owner', () => {
    expect(() =>
      service.assertCanManageMember(
        OrganizationRole.admin,
        OrganizationRole.member,
        OrganizationRole.owner,
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks guest from managing members', () => {
    expect(() =>
      service.assertCanManageMember(
        OrganizationRole.guest,
        OrganizationRole.member,
        OrganizationRole.member,
      ),
    ).toThrow(ForbiddenException);
  });

  it('throws when attempting to remove last active owner', async () => {
    prisma.organizationMember.count.mockResolvedValueOnce(1);

    await expect(
      service.assertNotLastActiveOwner('org-1', {
        id: 'membership-1',
        role: OrganizationRole.owner,
        isActive: true,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
