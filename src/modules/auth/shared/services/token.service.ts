import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import {
  parseDurationToMilliseconds,
  parseDurationToSeconds,
} from 'src/common/utils/duration.util';
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
      expiresIn: parseDurationToSeconds(
        this.configService.getOrThrow<string>('jwt.accessExpiresIn'),
        60 * 60,
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
    return parseDurationToMilliseconds(expiresIn, 7 * 24 * 60 * 60 * 1000);
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
