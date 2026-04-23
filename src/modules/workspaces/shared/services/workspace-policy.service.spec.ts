import { ConflictException, ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { WorkspacePolicyService } from './workspace-policy.service';

describe('WorkspacePolicyService', () => {
  const prisma = {
    workspaceMember: {
      count: jest.fn(),
    },
  };

  let service: WorkspacePolicyService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new WorkspacePolicyService(prisma as never);
  });

  it('allows owner to invite admin', () => {
    expect(() =>
      service.assertCanInviteRole(WorkspaceRole.owner, WorkspaceRole.admin),
    ).not.toThrow();
  });

  it('blocks admin from inviting admin', () => {
    expect(() =>
      service.assertCanInviteRole(WorkspaceRole.admin, WorkspaceRole.admin),
    ).toThrow(ForbiddenException);
  });

  it('blocks guest from sending invites', () => {
    expect(() =>
      service.assertCanInviteRole(WorkspaceRole.guest, WorkspaceRole.member),
    ).toThrow(ForbiddenException);
  });

  it('blocks role update when admin tries to promote to owner', () => {
    expect(() =>
      service.assertCanManageMember(
        WorkspaceRole.admin,
        WorkspaceRole.member,
        WorkspaceRole.owner,
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks guest from managing members', () => {
    expect(() =>
      service.assertCanManageMember(
        WorkspaceRole.guest,
        WorkspaceRole.member,
        WorkspaceRole.member,
      ),
    ).toThrow(ForbiddenException);
  });

  it('throws when attempting to remove last active owner', async () => {
    prisma.workspaceMember.count.mockResolvedValueOnce(1);

    await expect(
      service.assertNotLastActiveOwner('org-1', {
        id: 'membership-1',
        role: WorkspaceRole.owner,
        isActive: true,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
