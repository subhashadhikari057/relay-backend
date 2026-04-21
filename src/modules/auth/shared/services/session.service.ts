import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

type CreateSessionInput = {
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
};

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(input: CreateSessionInput) {
    const tokenHash = this.hashToken(input.refreshToken);

    return this.prisma.session.create({
      data: {
        userId: input.userId,
        tokenHash,
        expiresAt: input.expiresAt,
        deviceInfo: input.deviceInfo,
        ipAddress: input.ipAddress,
      },
    });
  }

  findActiveSessionById(sessionId: string) {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  findActiveSessionByToken(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    return this.prisma.session.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revokeByToken(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.session.updateMany({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async rotateSessionRefreshToken(input: {
    sessionId: string;
    refreshToken: string;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    const tokenHash = this.hashToken(input.refreshToken);

    return this.prisma.session.update({
      where: { id: input.sessionId },
      data: {
        tokenHash,
        expiresAt: input.expiresAt,
        deviceInfo: input.deviceInfo,
        ipAddress: input.ipAddress,
      },
    });
  }

  async revokeById(sessionId: string) {
    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  isRefreshTokenMatch(token: string, tokenHash: string) {
    return this.hashToken(token) === tokenHash;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
