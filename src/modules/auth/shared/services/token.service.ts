import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { AuthJwtPayload } from '../interfaces/auth-jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createAccessToken(payload: AuthJwtPayload) {
    const privateKey = this.getPrivateKey();

    return this.jwtService.signAsync(payload, {
      privateKey,
      algorithm: 'RS256',
      expiresIn: this.parseDurationToSeconds(
        this.configService.getOrThrow<string>('jwt.accessExpiresIn'),
      ),
    });
  }

  createRefreshToken() {
    return randomBytes(48).toString('hex');
  }

  async verifyAccessToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<AuthJwtPayload>(token, {
        publicKey: this.getPublicKey(),
        algorithms: ['RS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  getRefreshTokenMaxAgeMs() {
    const expiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );

    const matched = expiresIn.match(/^(\d+)([smhd])$/i);
    if (!matched) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(matched[1]);
    const unit = matched[2].toLowerCase();

    const unitMap: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (unitMap[unit] ?? unitMap.d);
  }

  private parseDurationToSeconds(duration: string) {
    const matched = duration.match(/^(\d+)([smhd])$/i);
    if (!matched) {
      return 60 * 60;
    }

    const value = Number(matched[1]);
    const unit = matched[2].toLowerCase();

    const unitMap: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };

    return value * (unitMap[unit] ?? unitMap.h);
  }

  private getPrivateKey() {
    const encoded = this.configService.getOrThrow<string>(
      'jwt.privateKeyBase64',
    );
    return Buffer.from(encoded, 'base64').toString('utf8');
  }

  private getPublicKey() {
    const encoded = this.configService.getOrThrow<string>(
      'jwt.publicKeyBase64',
    );
    return Buffer.from(encoded, 'base64').toString('utf8');
  }
}
