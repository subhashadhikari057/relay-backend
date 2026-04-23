import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, PlatformRole, Prisma, User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { AuditService } from 'src/modules/audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from 'src/modules/audit/shared/audit.constants';
import { AuditEventFactory } from 'src/modules/audit/shared/audit-event-factory.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from '../../shared/services/auth.service';
import { GoogleLoginMobileDto } from '../dto/google-login-mobile.dto';

type AuthContext = {
  deviceInfo?: string;
  ipAddress?: string;
};

type GoogleProfile = {
  googleAccountId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
};

@Injectable()
export class GoogleAuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly auditEventFactory: AuditEventFactory,
  ) {}

  async loginWithGoogle(dto: GoogleLoginMobileDto, context: AuthContext) {
    const profile = await this.verifyGoogleToken(dto.idToken);
    const user = await this.findOrCreateLinkedUser(profile);

    if (!user.isActive) {
      throw new ForbiddenException('User is inactive');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditService.recordSafe(
      this.auditEventFactory.build({
        actorUserId: updatedUser.id,
        action: AuditAction.AUTH_LOGIN_SUCCEEDED,
        entityType: AuditEntityType.USER,
        entityId: updatedUser.id,
        metadata: {
          audience: 'mobile',
          provider: AuthProvider.google,
          ipAddress: context.ipAddress ?? null,
          deviceInfo: context.deviceInfo ?? null,
        },
      }),
    );

    return this.authService.issueAuthenticatedSession(updatedUser, context);
  }

  private async verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
    const clientId = this.configService.get<string>('auth.googleClientId');
    if (!clientId) {
      throw new ServiceUnavailableException('Google login is not configured');
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email) {
        throw new UnauthorizedException('Google token is missing account data');
      }

      if (!payload.email_verified) {
        throw new ForbiddenException('Google email must be verified');
      }

      return {
        googleAccountId: payload.sub,
        email: payload.email.trim().toLowerCase(),
        fullName: payload.name,
        avatarUrl: payload.picture,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async findOrCreateLinkedUser(profile: GoogleProfile) {
    const linkedAccount = await this.prisma.authAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: AuthProvider.google,
          providerAccountId: profile.googleAccountId,
        },
      },
      include: {
        user: true,
      },
    });

    if (linkedAccount) {
      return this.updateProfileFromGoogle(linkedAccount.user, profile);
    }

    return this.linkOrCreateUserByEmail(profile);
  }

  private async linkOrCreateUserByEmail(profile: GoogleProfile) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      return this.linkExistingUser(existingUser, profile);
    }

    return this.prisma.user.create({
      data: {
        email: profile.email,
        passwordHash: null,
        fullName: this.resolveFullName(profile),
        displayName: this.resolveDisplayName(profile.fullName),
        avatarUrl: profile.avatarUrl?.trim() || null,
        platformRole: PlatformRole.user,
        emailVerifiedAt: new Date(),
        authAccounts: {
          create: {
            provider: AuthProvider.google,
            providerAccountId: profile.googleAccountId,
          },
        },
      },
    });
  }

  private async linkExistingUser(user: User, profile: GoogleProfile) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.authAccount.create({
          data: {
            userId: user.id,
            provider: AuthProvider.google,
            providerAccountId: profile.googleAccountId,
          },
        });

        return tx.user.update({
          where: { id: user.id },
          data: this.buildGoogleProfileUpdate(user, profile),
        });
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const linkedAccount = await this.prisma.authAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: AuthProvider.google,
              providerAccountId: profile.googleAccountId,
            },
          },
          include: { user: true },
        });

        if (linkedAccount) {
          return this.updateProfileFromGoogle(linkedAccount.user, profile);
        }

        throw new ConflictException('Google account is already linked');
      }

      throw error;
    }
  }

  private updateProfileFromGoogle(user: User, profile: GoogleProfile) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: this.buildGoogleProfileUpdate(user, profile),
    });
  }

  private buildGoogleProfileUpdate(
    user: User,
    profile: GoogleProfile,
  ): Prisma.UserUpdateInput {
    return {
      ...(user.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }),
      ...(!user.avatarUrl && profile.avatarUrl?.trim()
        ? { avatarUrl: profile.avatarUrl.trim() }
        : {}),
      ...(!user.displayName && profile.fullName?.trim()
        ? { displayName: this.resolveDisplayName(profile.fullName) }
        : {}),
    };
  }

  private resolveFullName(profile: { fullName?: string; email: string }) {
    return profile.fullName?.trim() || profile.email.split('@')[0];
  }

  private resolveDisplayName(fullName?: string) {
    const normalized = fullName?.trim();
    if (!normalized) {
      return null;
    }

    return normalized.split(/\s+/)[0];
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
