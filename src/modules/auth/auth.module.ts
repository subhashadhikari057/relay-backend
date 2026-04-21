import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthController } from './admin/auth.admin.controller';
import { MobileAuthController } from './mobile/auth.mobile.controller';
import { AuthCookieService } from './shared/services/auth-cookie.service';
import { AuthService } from './shared/services/auth.service';
import { EmailDeliveryService } from './shared/services/email-delivery.service';
import { EmailVerificationService } from './shared/services/email-verification.service';
import { PasswordService } from './shared/services/password.service';
import { SessionService } from './shared/services/session.service';
import { SessionNotificationService } from './shared/services/session-notification.service';
import { TokenService } from './shared/services/token.service';
import { AccessTokenGuard } from './shared/guards/access-token.guard';
import { PlatformRoleGuard } from './shared/guards/platform-role.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AdminAuthController, MobileAuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    SessionService,
    SessionNotificationService,
    AuthCookieService,
    EmailVerificationService,
    EmailDeliveryService,
    AccessTokenGuard,
    PlatformRoleGuard,
  ],
  exports: [AccessTokenGuard, PlatformRoleGuard, TokenService, SessionService],
})
export class AuthModule {}
