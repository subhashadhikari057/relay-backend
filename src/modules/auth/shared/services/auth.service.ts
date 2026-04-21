import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PlatformRole, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginMobileDto } from '../../mobile/dto/login-mobile.dto';
import { SignupMobileDto } from '../../mobile/dto/signup-mobile.dto';
import { LoginAdminDto } from '../../admin/dto/login-admin.dto';
import { PasswordService } from './password.service';
import { EmailVerificationService } from './email-verification.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

export type AuthAudience = 'mobile' | 'admin';

type AuthContext = {
  deviceInfo?: string;
  ipAddress?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly emailVerificationService: EmailVerificationService,
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
      throw new UnauthorizedException('Refresh session is invalid');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      sessionId: session.id,
    };
    const accessToken = await this.tokenService.createAccessToken(payload);
    const nextRefreshToken = this.tokenService.createRefreshToken();
    const refreshTtl = this.tokenService.getRefreshTokenMaxAgeMs();

    await this.sessionService.rotateSessionRefreshToken({
      sessionId: session.id,
      refreshToken: nextRefreshToken,
      expiresAt: new Date(Date.now() + refreshTtl),
      deviceInfo: context.deviceInfo,
      ipAddress: context.ipAddress,
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      sessionId: session.id,
      user: this.toSafeUser(user),
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
  }

  async getMe(userId: string, audience: AuthAudience) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertAudienceRole(user, audience);

    return this.toSafeUser(user);
  }

  requestEmailVerification(userId: string) {
    return this.emailVerificationService.requestForUser(userId);
  }

  confirmEmailVerification(rawToken: string) {
    return this.emailVerificationService.confirm(rawToken);
  }

  private async issueTokensAndSession(user: User, context: AuthContext) {
    const refreshToken = this.tokenService.createRefreshToken();

    const refreshTtl = this.tokenService.getRefreshTokenMaxAgeMs();
    const session = await this.sessionService.createSession({
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + refreshTtl),
      deviceInfo: context.deviceInfo,
      ipAddress: context.ipAddress,
    });
    const payload = {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      sessionId: session.id,
    };
    const accessToken = await this.tokenService.createAccessToken(payload);

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      user: this.toSafeUser(user),
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
