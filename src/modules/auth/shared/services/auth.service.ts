import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformRole, User } from '@prisma/client';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionsPolicyService } from 'src/modules/permissions/services/permissions-policy.service';
import { LoginMobileDto } from '../../mobile/dto/login-mobile.dto';
import { SignupMobileDto } from '../../mobile/dto/signup-mobile.dto';
import { LoginAdminDto } from '../../admin/dto/login-admin.dto';
import { PasswordService } from './password.service';
import { EmailVerificationService } from './email-verification.service';
import { SessionService } from './session.service';
import { SessionNotificationService } from './session-notification.service';
import { TokenService } from './token.service';

export type AuthAudience = 'mobile' | 'admin';

type AuthContext = {
  deviceInfo?: string;
  ipAddress?: string;
};

@Injectable()
export class AuthService {
  private static readonly SESSION_TOKEN_RETRY_LIMIT = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly sessionNotificationService: SessionNotificationService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
    private readonly permissionsPolicyService: PermissionsPolicyService,
  ) {}

  async signupMobile(dto: SignupMobileDto, context: AuthContext) {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ForbiddenException('Email is already in use');
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName,
        displayName: dto.displayName,
        platformRole: PlatformRole.user,
      },
    });

    return this.issueTokensAndSession(user, context);
  }

  async login(
    dto: LoginMobileDto | LoginAdminDto,
    audience: AuthAudience,
    context: AuthContext,
  ) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User is inactive');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Password login is not available for this account',
      );
    }

    const matched = await this.passwordService.verifyPassword(
      user.passwordHash,
      dto.password,
    );

    if (!matched) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertAudienceRole(user, audience);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        actorUserId: user.id,
        action: AuditAction.AUTH_LOGIN_SUCCEEDED,
        entityType: AuditEntityType.USER,
        entityId: user.id,
        metadata: {
          audience,
          ipAddress: context.ipAddress ?? null,
          deviceInfo: context.deviceInfo ?? null,
        },
      }),
    );

    return this.issueTokensAndSession(user, context);
  }

  async refresh(
    sessionId: string,
    refreshToken: string,
    audience: AuthAudience,
    context: AuthContext,
  ) {
    const session = await this.sessionService.findActiveSessionById(sessionId);
    if (!session) {
      throw new UnauthorizedException('Refresh session is invalid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User is inactive');
    }

    this.assertAudienceRole(user, audience);

    const isRefreshTokenMatch = this.sessionService.isRefreshTokenMatch(
      refreshToken,
      session.tokenHash,
    );

    if (!isRefreshTokenMatch) {
      await this.sessionService.revokeById(session.id);
      await this.auditService.recordSafe(
        this.auditEventFactory.build({
          actorUserId: user.id,
          action: AuditAction.AUTH_REFRESH_FAILED,
          entityType: AuditEntityType.SESSION,
          entityId: session.id,
          metadata: { audience, reason: 'refresh_token_mismatch' },
        }),
      );
      throw new UnauthorizedException('Refresh session is invalid');
    }

    const payload = await this.buildJwtPayload({
      user,
      sessionId: session.id,
      activeWorkspaceId: session.activeWorkspaceId,
    });
    const refreshTtl = this.tokenService.getRefreshTokenMaxAgeMs();
    const nextRefreshToken = await this.rotateSessionWithRetry({
      sessionId: session.id,
      expiresAt: new Date(Date.now() + refreshTtl),
      deviceInfo: context.deviceInfo,
      ipAddress: context.ipAddress,
    });
    const accessToken = await this.tokenService.createAccessToken(payload);

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      sessionId: session.id,
      user: this.toSafeUser(user),
      activeWorkspaceId: session.activeWorkspaceId,
      activeWorkspace: await this.resolveActiveWorkspaceSummary(
        user.id,
        session.activeWorkspaceId,
      ),
    };
  }

  async restoreSession(
    sessionId: string,
    refreshToken: string,
    audience: AuthAudience,
  ) {
    const session = await this.sessionService.findActiveSessionById(sessionId);
    if (!session) {
      throw new UnauthorizedException('Refresh session is invalid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User is inactive');
    }

    this.assertAudienceRole(user, audience);

    const isRefreshTokenMatch = this.sessionService.isRefreshTokenMatch(
      refreshToken,
      session.tokenHash,
    );

    if (!isRefreshTokenMatch) {
      throw new UnauthorizedException('Refresh session is invalid');
    }

    await this.sessionService.touchSessionActivity(session.id);

    const payload = await this.buildJwtPayload({
      user,
      sessionId: session.id,
      activeWorkspaceId: session.activeWorkspaceId,
    });
    const accessToken = await this.tokenService.createAccessToken(payload);

    return {
      accessToken,
      user: this.toSafeUser(user),
      activeWorkspaceId: session.activeWorkspaceId,
      activeWorkspace: await this.resolveActiveWorkspaceSummary(
        user.id,
        session.activeWorkspaceId,
      ),
    };
  }

  async logout(sessionId: string, audience: AuthAudience) {
    const session = await this.sessionService.findActiveSessionById(sessionId);
    if (!session) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertAudienceRole(user, audience);

    await this.sessionService.revokeById(session.id);
    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        actorUserId: user.id,
        action: AuditAction.AUTH_LOGOUT_SUCCEEDED,
        entityType: AuditEntityType.SESSION,
        entityId: session.id,
        metadata: { audience },
      }),
    );
  }

  async switchActiveWorkspace(
    userId: string,
    audience: AuthAudience,
    sessionId: string,
    workspaceId: string | null,
  ) {
    if (audience !== 'mobile') {
      throw new ForbiddenException('Active workspace switch is mobile-only');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertAudienceRole(user, audience);

    const session = await this.sessionService.findActiveSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    const resolvedActiveWorkspaceId = workspaceId
      ? await this.resolveActiveWorkspaceForUser(userId, workspaceId)
      : null;

    await this.sessionService.setActiveWorkspaceId(
      sessionId,
      resolvedActiveWorkspaceId,
    );

    const accessToken = await this.tokenService.createAccessToken(
      await this.buildJwtPayload({
        user,
        sessionId,
        activeWorkspaceId: resolvedActiveWorkspaceId,
      }),
    );

    return {
      accessToken,
      user: this.toSafeUser(user),
      activeWorkspaceId: resolvedActiveWorkspaceId,
    };
  }

  async getMe(userId: string, audience: AuthAudience) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertAudienceRole(user, audience);

    return this.toSafeUser(user);
  }

  async getActiveSessions(
    userId: string,
    audience: AuthAudience,
    currentSessionId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertAudienceRole(user, audience);

    const sessions =
      await this.sessionService.findActiveSessionsByUserId(userId);

    return {
      count: sessions.length,
      sessions: sessions.map((session) => ({
        sessionId: session.id,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        currentSession: session.id === currentSessionId,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        expiresAt: session.expiresAt,
      })),
    };
  }

  async revokeSingleSession(
    userId: string,
    audience: AuthAudience,
    currentSessionId: string,
    targetSessionId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertAudienceRole(user, audience);

    if (targetSessionId === currentSessionId) {
      throw new BadRequestException(
        'Cannot revoke current session from this endpoint. Use logout instead.',
      );
    }

    const revoked = await this.sessionService.revokeByIdForUser(
      userId,
      targetSessionId,
    );

    if (!revoked) {
      throw new NotFoundException('Session not found');
    }

    this.sessionNotificationService.notifySessionEvicted({
      userId,
      sessionId: targetSessionId,
      reason: 'revoked_by_user',
    });

    return { success: true };
  }

  async revokeOtherSessions(
    userId: string,
    audience: AuthAudience,
    currentSessionId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertAudienceRole(user, audience);

    const sessions =
      await this.sessionService.findActiveSessionsByUserId(userId);
    const revokedTargets = sessions.filter(
      (session) => session.id !== currentSessionId,
    );

    const revokedCount = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.session.updateMany({
        where: {
          userId,
          revokedAt: null,
          id: {
            not: currentSessionId,
          },
        },
        data: {
          revokedAt: new Date(),
        },
      });

      if (revoked.count > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            tokenVersion: { increment: 1 },
          },
        });
      }

      return revoked.count;
    });

    for (const session of revokedTargets) {
      this.sessionNotificationService.notifySessionEvicted({
        userId,
        sessionId: session.id,
        reason: 'revoked_by_user',
      });
    }

    return {
      success: true,
      revokedCount,
    };
  }

  requestEmailVerification(userId: string) {
    return this.emailVerificationService.requestForUser(userId);
  }

  async confirmEmailVerification(rawToken: string) {
    const result = await this.emailVerificationService.confirm(rawToken);
    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        actorUserId: result.userId,
        action: AuditAction.AUTH_EMAIL_VERIFIED,
        entityType: AuditEntityType.USER,
        entityId: result.userId,
      }),
    );
    return result;
  }

  issueAuthenticatedSession(user: User, context: AuthContext) {
    return this.issueTokensAndSession(user, context);
  }

  private async issueTokensAndSession(user: User, context: AuthContext) {
    await this.enforceSessionLimitBeforeCreate(user.id);
    const refreshTtl = this.tokenService.getRefreshTokenMaxAgeMs();
    const activeWorkspaceId =
      user.platformRole === PlatformRole.user
        ? await this.resolveDefaultActiveWorkspace(user.id)
        : null;
    const sessionWithToken = await this.createSessionWithRetry({
      userId: user.id,
      activeWorkspaceId,
      expiresAt: new Date(Date.now() + refreshTtl),
      deviceInfo: context.deviceInfo,
      ipAddress: context.ipAddress,
    });
    const payload = await this.buildJwtPayload({
      user,
      sessionId: sessionWithToken.session.id,
      activeWorkspaceId: sessionWithToken.session.activeWorkspaceId,
    });
    const accessToken = await this.tokenService.createAccessToken(payload);

    return {
      accessToken,
      refreshToken: sessionWithToken.refreshToken,
      sessionId: sessionWithToken.session.id,
      user: this.toSafeUser(user),
      activeWorkspaceId: sessionWithToken.session.activeWorkspaceId,
      activeWorkspace: await this.resolveActiveWorkspaceSummary(
        user.id,
        sessionWithToken.session.activeWorkspaceId,
      ),
    };
  }

  private async enforceSessionLimitBeforeCreate(userId: string) {
    const maxSessions = this.getMaxActiveSessionsPerUser();
    if (maxSessions <= 0) {
      return;
    }

    const activeSessions =
      await this.sessionService.findActiveSessionsByUserId(userId);
    if (activeSessions.length < maxSessions) {
      return;
    }

    const oldestSession = activeSessions[0];
    await this.sessionService.revokeById(oldestSession.id);
    this.sessionNotificationService.notifySessionEvicted({
      userId,
      sessionId: oldestSession.id,
      reason: 'signed_in_on_new_device',
    });
  }

  private getMaxActiveSessionsPerUser() {
    return this.configService.getOrThrow<number>(
      'auth.maxActiveSessionsPerUser',
    );
  }

  private async createSessionWithRetry(input: {
    userId: string;
    activeWorkspaceId?: string | null;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    for (
      let attempt = 1;
      attempt <= AuthService.SESSION_TOKEN_RETRY_LIMIT;
      attempt += 1
    ) {
      const refreshToken = this.tokenService.createRefreshToken();

      try {
        const session = await this.sessionService.createSession({
          userId: input.userId,
          refreshToken,
          activeWorkspaceId: input.activeWorkspaceId ?? null,
          expiresAt: input.expiresAt,
          deviceInfo: input.deviceInfo,
          ipAddress: input.ipAddress,
        });

        return { session, refreshToken };
      } catch (error: unknown) {
        if (
          this.isSessionTokenCollision(error) &&
          attempt < AuthService.SESSION_TOKEN_RETRY_LIMIT
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new UnauthorizedException('Failed to create session');
  }

  private async rotateSessionWithRetry(input: {
    sessionId: string;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    for (
      let attempt = 1;
      attempt <= AuthService.SESSION_TOKEN_RETRY_LIMIT;
      attempt += 1
    ) {
      const refreshToken = this.tokenService.createRefreshToken();

      try {
        await this.sessionService.rotateSessionRefreshToken({
          sessionId: input.sessionId,
          refreshToken,
          expiresAt: input.expiresAt,
          deviceInfo: input.deviceInfo,
          ipAddress: input.ipAddress,
        });

        return refreshToken;
      } catch (error: unknown) {
        if (
          this.isSessionTokenCollision(error) &&
          attempt < AuthService.SESSION_TOKEN_RETRY_LIMIT
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new UnauthorizedException('Failed to rotate session');
  }

  private isSessionTokenCollision(error: unknown) {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const code =
      'code' in error && typeof error.code === 'string' ? error.code : null;
    if (code !== 'P2002') {
      return false;
    }

    const meta = 'meta' in error ? (error.meta as { target?: unknown }) : null;
    const target = meta?.target;
    if (Array.isArray(target)) {
      return target.includes('token_hash');
    }

    return typeof target === 'string' && target.includes('token_hash');
  }

  private async resolveDefaultActiveWorkspace(userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
        isActive: true,
        workspace: {
          isActive: true,
          deletedAt: null,
        },
      },
      orderBy: [{ joinedAt: 'desc' }],
      select: {
        workspaceId: true,
      },
    });

    return membership?.workspaceId ?? null;
  }

  private async resolveActiveWorkspaceForUser(
    userId: string,
    workspaceId: string,
  ) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        workspace: {
          select: {
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new NotFoundException('Workspace not found');
    }

    if (!membership.workspace.isActive || membership.workspace.deletedAt) {
      throw new NotFoundException('Workspace not found');
    }

    return workspaceId;
  }

  private async resolveActiveWorkspaceSummary(
    userId: string,
    workspaceId?: string | null,
  ) {
    if (!workspaceId) {
      return null;
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            avatarUrl: true,
            avatarColor: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !membership ||
      !membership.isActive ||
      !membership.workspace.isActive ||
      membership.workspace.deletedAt
    ) {
      return null;
    }

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      description: membership.workspace.description,
      avatarUrl: membership.workspace.avatarUrl,
      avatarColor: membership.workspace.avatarColor,
      role: membership.role,
    };
  }

  private async buildJwtPayload(input: {
    user: User;
    sessionId: string;
    activeWorkspaceId?: string | null;
  }) {
    const platformPermissions =
      await this.permissionsPolicyService.getPlatformPermissionMap(
        input.user.platformRole,
      );

    let workspacePermissions: Record<string, number> | undefined;
    let activeWorkspaceId: string | undefined;

    if (input.activeWorkspaceId) {
      const membership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.activeWorkspaceId,
            userId: input.user.id,
          },
        },
        include: {
          workspace: {
            select: {
              isActive: true,
              deletedAt: true,
            },
          },
        },
      });

      if (
        membership &&
        membership.isActive &&
        membership.workspace.isActive &&
        !membership.workspace.deletedAt
      ) {
        workspacePermissions =
          await this.permissionsPolicyService.getWorkspacePermissionMap(
            input.activeWorkspaceId,
            membership.role,
          );
        activeWorkspaceId = input.activeWorkspaceId;
      }
    }

    return {
      sub: input.user.id,
      email: input.user.email,
      platformRole: input.user.platformRole,
      sessionId: input.sessionId,
      platformPermissions,
      activeWorkspaceId,
      workspacePermissions,
      permissionsVersion: Date.now(),
      tokenVersion: input.user.tokenVersion,
    };
  }

  private assertAudienceRole(user: User, audience: AuthAudience) {
    if (audience === 'admin' && user.platformRole !== PlatformRole.superadmin) {
      throw new ForbiddenException('Superadmin role required');
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarColor: user.avatarColor,
      status: user.status,
      isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt,
      isEmailVerified: user.emailVerifiedAt !== null,
      platformRole: user.platformRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
