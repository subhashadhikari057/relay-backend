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
    refreshToken: string,
    audience: AuthAudience,
    context: AuthContext,
  ) {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User is inactive');
    }

    this.assertAudienceRole(user, audience);

    const activeSession = await this.sessionService.findActiveSessionByToken(
      user.id,
      refreshToken,
    );

    if (!activeSession) {
      throw new UnauthorizedException('Refresh session is invalid');
    }

    await this.sessionService.revokeByToken(user.id, refreshToken);

    return this.issueTokensAndSession(user, context);
  }

  async logout(refreshToken: string, audience: AuthAudience) {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertAudienceRole(user, audience);

    await this.sessionService.revokeByToken(user.id, refreshToken);
  }

  async getMe(userId: string, audience: AuthAudience) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertAudienceRole(user, audience);

    return this.toSafeUser(user);
  }

  private async issueTokensAndSession(user: User, context: AuthContext) {
    const payload = {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.createAccessToken(payload),
      this.tokenService.createRefreshToken(payload),
    ]);

    const refreshTtl = this.tokenService.getRefreshTokenMaxAgeMs();
    await this.sessionService.createSession({
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + refreshTtl),
      deviceInfo: context.deviceInfo,
      ipAddress: context.ipAddress,
    });

    return {
      accessToken,
      refreshToken,
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
      platformRole: user.platformRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
