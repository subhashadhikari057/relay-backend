import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailDeliveryService } from './email-delivery.service';

type ConfirmVerificationResult = {
  emailVerifiedAt: Date;
  isEmailVerified: true;
};

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailDeliveryService: EmailDeliveryService,
  ) {}

  async requestForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerifiedAt) {
      return {
        message: 'Email is already verified.',
        emailVerifiedAt: user.emailVerifiedAt,
        isEmailVerified: true,
      };
    }

    await this.prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + this.getTokenExpirationDurationMilliseconds(),
    );

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const verificationUrl = this.buildVerificationUrl(rawToken);
    this.emailDeliveryService.sendEmailVerification({
      email: user.email,
      fullName: user.fullName,
      verificationUrl,
    });

    return {
      message: 'Verification email has been sent.',
      emailVerifiedAt: null,
      isEmailVerified: false,
    };
  }

  async confirm(rawToken: string): Promise<ConfirmVerificationResult> {
    const normalizedToken = rawToken.trim();
    if (!normalizedToken) {
      throw new BadRequestException('Verification token is required');
    }

    const tokenHash = this.hashToken(normalizedToken);
    const verificationToken =
      await this.prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
      });

    if (!verificationToken) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verificationToken.usedAt) {
      throw new BadRequestException('Verification token has already been used');
    }

    if (verificationToken.expiresAt <= new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    const verifiedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: verifiedAt },
      }),
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerifiedAt: verifiedAt },
      }),
    ]);

    return {
      emailVerifiedAt: verifiedAt,
      isEmailVerified: true,
    };
  }

  private generateToken() {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildVerificationUrl(token: string) {
    const verificationUrlBase = this.configService.getOrThrow<string>(
      'auth.emailVerificationUrlBase',
    );
    const url = new URL(verificationUrlBase);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private getTokenExpirationDurationMilliseconds() {
    const expiresIn = this.configService.getOrThrow<string>(
      'auth.emailVerificationTokenExpiresIn',
    );

    const matched = expiresIn.match(/^(\d+)([smhd])$/i);
    if (!matched) {
      return 20 * 60 * 1000;
    }

    const value = Number(matched[1]);
    const unit = matched[2].toLowerCase();
    const unitMap: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (unitMap[unit] ?? unitMap.m);
  }
}
