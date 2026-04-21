import { PlatformRole, User } from '@prisma/client';
import { AuthService } from './auth.service';

function buildUser(overrides?: Partial<User>): User {
  const now = new Date();

  return {
    id: 'user-1',
    email: 'user@relay.com',
    passwordHash: 'hashed-password',
    fullName: 'Relay User',
    displayName: 'relay-user',
    avatarUrl: null,
    status: null,
    isActive: true,
    platformRole: PlatformRole.user,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('AuthService collision retry', () => {
  const collisionError = {
    code: 'P2002',
    meta: {
      target: ['token_hash'],
    },
  };

  it('retries session creation when token hash collides during rapid login', async () => {
    const findUniqueMock = jest.fn().mockResolvedValue(buildUser());
    const updateMock = jest.fn().mockResolvedValue(buildUser());
    const verifyPasswordMock = jest.fn().mockResolvedValue(true);
    const createAccessTokenMock = jest.fn().mockResolvedValue('access-token');
    const createRefreshTokenMock = jest
      .fn()
      .mockReturnValueOnce('refresh-token-1')
      .mockReturnValueOnce('refresh-token-2');
    const getRefreshTokenMaxAgeMsMock = jest.fn().mockReturnValue(60_000);
    const createSessionMock = jest
      .fn()
      .mockRejectedValueOnce(collisionError)
      .mockResolvedValueOnce({ id: 'session-2' });

    const configGetOrThrowMock = jest.fn().mockImplementation((key: string) => {
      if (key === 'auth.maxActiveSessionsPerUser') return 0;
      return null;
    });

    const service = new AuthService(
      {
        user: {
          findUnique: findUniqueMock,
          update: updateMock,
        },
      } as never,
      {
        verifyPassword: verifyPasswordMock,
      } as never,
      {
        createAccessToken: createAccessTokenMock,
        createRefreshToken: createRefreshTokenMock,
        getRefreshTokenMaxAgeMs: getRefreshTokenMaxAgeMsMock,
      } as never,
      {
        createSession: createSessionMock,
        findActiveSessionsByUserId: jest.fn(),
      } as never,
      { notifySessionEvicted: jest.fn() } as never,
      {} as never,
      { getOrThrow: configGetOrThrowMock } as never,
    );

    const result = await service.login(
      { email: 'user@relay.com', password: 'userpassword123' },
      'mobile',
      { deviceInfo: 'jest', ipAddress: '127.0.0.1' },
    );

    expect(createSessionMock).toHaveBeenCalledTimes(2);
    expect(createRefreshTokenMock).toHaveBeenCalledTimes(2);
    expect(result.refreshToken).toBe('refresh-token-2');
    expect(result.sessionId).toBe('session-2');
  });

  it('retries refresh token rotation when token hash collides during rapid refresh', async () => {
    const user = buildUser();
    const findUniqueMock = jest.fn().mockResolvedValue(user);
    const createAccessTokenMock = jest.fn().mockResolvedValue('next-access');
    const createRefreshTokenMock = jest
      .fn()
      .mockReturnValueOnce('next-refresh-1')
      .mockReturnValueOnce('next-refresh-2');
    const getRefreshTokenMaxAgeMsMock = jest.fn().mockReturnValue(60_000);
    const findActiveSessionByIdMock = jest.fn().mockResolvedValue({
      id: 'session-1',
      userId: user.id,
      tokenHash: 'stored-hash',
    });
    const isRefreshTokenMatchMock = jest.fn().mockReturnValue(true);
    const rotateSessionRefreshTokenMock = jest
      .fn()
      .mockRejectedValueOnce(collisionError)
      .mockResolvedValueOnce({});
    const revokeByIdMock = jest.fn();

    const configGetOrThrowMock = jest.fn().mockImplementation((key: string) => {
      if (key === 'auth.maxActiveSessionsPerUser') return 0;
      return null;
    });

    const service = new AuthService(
      {
        user: {
          findUnique: findUniqueMock,
        },
      } as never,
      {} as never,
      {
        createAccessToken: createAccessTokenMock,
        createRefreshToken: createRefreshTokenMock,
        getRefreshTokenMaxAgeMs: getRefreshTokenMaxAgeMsMock,
      } as never,
      {
        findActiveSessionById: findActiveSessionByIdMock,
        isRefreshTokenMatch: isRefreshTokenMatchMock,
        rotateSessionRefreshToken: rotateSessionRefreshTokenMock,
        revokeById: revokeByIdMock,
      } as never,
      { notifySessionEvicted: jest.fn() } as never,
      {} as never,
      { getOrThrow: configGetOrThrowMock } as never,
    );

    const result = await service.refresh(
      'session-1',
      'incoming-refresh',
      'mobile',
      { deviceInfo: 'jest', ipAddress: '127.0.0.1' },
    );

    expect(rotateSessionRefreshTokenMock).toHaveBeenCalledTimes(2);
    expect(createRefreshTokenMock).toHaveBeenCalledTimes(2);
    expect(revokeByIdMock).not.toHaveBeenCalled();
    expect(result.refreshToken).toBe('next-refresh-2');
    expect(result.accessToken).toBe('next-access');
  });

  it('auto-revokes oldest active session when user is at max session limit', async () => {
    const findUniqueMock = jest.fn().mockResolvedValue(buildUser());
    const updateMock = jest.fn().mockResolvedValue(buildUser());
    const verifyPasswordMock = jest.fn().mockResolvedValue(true);
    const createAccessTokenMock = jest.fn().mockResolvedValue('access-token');
    const createRefreshTokenMock = jest.fn().mockReturnValue('refresh-token');
    const getRefreshTokenMaxAgeMsMock = jest.fn().mockReturnValue(60_000);
    const createSessionMock = jest
      .fn()
      .mockResolvedValue({ id: 'session-new' });
    const revokeByIdMock = jest.fn().mockResolvedValue(undefined);
    const notifySessionEvictedMock = jest.fn();
    const activeSessions = [
      {
        id: 'session-oldest',
        deviceInfo: 'iPhone',
        ipAddress: '10.0.0.1',
        createdAt: new Date('2026-04-20T10:00:00.000Z'),
        expiresAt: new Date('2026-04-27T10:00:00.000Z'),
      },
    ];
    const findActiveSessionsByUserIdMock = jest
      .fn()
      .mockResolvedValue(activeSessions);
    const configGetOrThrowMock = jest.fn().mockImplementation((key: string) => {
      if (key === 'auth.maxActiveSessionsPerUser') return 1;
      return null;
    });

    const service = new AuthService(
      {
        user: {
          findUnique: findUniqueMock,
          update: updateMock,
        },
      } as never,
      {
        verifyPassword: verifyPasswordMock,
      } as never,
      {
        createAccessToken: createAccessTokenMock,
        createRefreshToken: createRefreshTokenMock,
        getRefreshTokenMaxAgeMs: getRefreshTokenMaxAgeMsMock,
      } as never,
      {
        findActiveSessionsByUserId: findActiveSessionsByUserIdMock,
        revokeById: revokeByIdMock,
        createSession: createSessionMock,
      } as never,
      { notifySessionEvicted: notifySessionEvictedMock } as never,
      {} as never,
      { getOrThrow: configGetOrThrowMock } as never,
    );

    const result = await service.login(
      { email: 'user@relay.com', password: 'userpassword123' },
      'mobile',
      { deviceInfo: 'jest', ipAddress: '127.0.0.1' },
    );

    expect(revokeByIdMock).toHaveBeenCalledWith('session-oldest');
    expect(notifySessionEvictedMock).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionId: 'session-oldest',
      reason: 'signed_in_on_new_device',
    });
    expect(result.sessionId).toBe('session-new');
  });
});
