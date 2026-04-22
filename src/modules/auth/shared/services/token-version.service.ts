import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenVersionEvent } from '../constants/token-version-event.enum';

@Injectable()
export class TokenVersionService {
  private readonly logger = new Logger(TokenVersionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async assertTokenVersionOrThrow(userId: string, tokenVersion: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== tokenVersion) {
      throw new UnauthorizedException({
        code: 'TOKEN_VERSION_MISMATCH',
        message:
          'Token version is outdated. Refresh token or login again to continue.',
      });
    }
  }

  async bumpForUser(userId: string, event: TokenVersionEvent) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
      },
    });

    this.logger.log(`Token version bumped for user=${userId} event=${event}`);
  }

  async bumpForUsers(userIds: string[], event: TokenVersionEvent) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) {
      return;
    }

    await this.prisma.user.updateMany({
      where: {
        id: {
          in: uniqueUserIds,
        },
      },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });

    this.logger.log(
      `Token version bumped for users count=${uniqueUserIds.length} event=${event}`,
    );
  }
}
