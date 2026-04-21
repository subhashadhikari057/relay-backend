import { AuditService } from './audit.service';
import { AuditAction, AuditEntityType } from './shared/audit.constants';

describe('AuditService', () => {
  const executeRawUnsafe = jest.fn();
  const queryRawUnsafe = jest.fn();

  const prisma = {
    $executeRawUnsafe: executeRawUnsafe,
    $queryRawUnsafe: queryRawUnsafe,
  };

  let service: AuditService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuditService(prisma as never);
  });

  it('stores an audit event via record()', async () => {
    executeRawUnsafe.mockResolvedValueOnce(1);

    await service.record({
      action: AuditAction.AUTH_LOGIN_SUCCEEDED,
      entityType: AuditEntityType.USER,
      entityId: 'user-1',
      actorUserId: 'user-1',
    });

    expect(executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('maps admin filters in listAdminAudit()', async () => {
    queryRawUnsafe.mockResolvedValueOnce([]);

    await service.listAdminAudit({
      organizationId: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
      actorUserId: '01968c8f-1234-7cd1-abcd-cc79f9d1d4d6',
      action: AuditAction.ORGANIZATION_MEMBER_ROLE_UPDATED,
      from: '2026-04-20T00:00:00.000Z',
      to: '2026-04-23T00:00:00.000Z',
      page: 2,
      limit: 10,
    });

    expect(queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql] = queryRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).toContain('FROM "audit_logs"');
    expect(sql).toContain('organization_id = $1');
    expect(sql).toContain('actor_user_id = $2');
    expect(sql).toContain('LIMIT');
    expect(sql).toContain('OFFSET');
  });

  it('recordSafe does not throw on write failure', async () => {
    executeRawUnsafe.mockRejectedValueOnce(new Error('db failure'));

    await expect(
      service.recordSafe({
        action: AuditAction.AUTH_LOGIN_SUCCEEDED,
        entityType: AuditEntityType.USER,
        entityId: 'user-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('maps user filters in listMyAudit()', async () => {
    queryRawUnsafe.mockResolvedValueOnce([]);

    await service.listMyAudit('01968c8f-1234-7cd1-abcd-cc79f9d1d4d6', {
      organizationId: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
      action: AuditAction.AUTH_LOGIN_SUCCEEDED,
      from: '2026-04-20T00:00:00.000Z',
      to: '2026-04-23T00:00:00.000Z',
      page: 2,
      limit: 10,
    });

    expect(queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql] = queryRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).toContain('FROM "audit_logs"');
    expect(sql).toContain('actor_user_id = $1');
    expect(sql).toContain('organization_id = $2');
    expect(sql).toContain('LIMIT');
    expect(sql).toContain('OFFSET');
  });
});
