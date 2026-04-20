import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthJwtPayload } from '../interfaces/auth-jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createAccessToken(payload: AuthJwtPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.parseDurationToSeconds(
        this.configService.getOrThrow<string>('jwt.accessExpiresIn'),
      ),
    });
  }

  createRefreshToken(payload: AuthJwtPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.parseDurationToSeconds(
        this.configService.getOrThrow<string>('jwt.refreshExpiresIn'),
      ),
    });
  }

  async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<AuthJwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
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
}
