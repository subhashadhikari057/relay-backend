import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthJwtPayload } from '../interfaces/auth-jwt-payload.interface';
import { SessionService } from '../services/session.service';
import { TokenService } from '../services/token.service';

type AuthenticatedRequest = Request & { user?: AuthJwtPayload };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const payload = await this.tokenService.verifyAccessToken(token);
    const session = await this.sessionService.findActiveSessionById(
      payload.sessionId,
    );

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    request.user = payload;
    return true;
  }

  private extractBearerToken(request: Request) {
    const authorization = request.headers.authorization;
    if (!authorization) return null;

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) return null;

    return token;
  }
}
