import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AdminAuthController } from './admin/auth.admin.controller';
import { MobileAuthController } from './mobile/auth.mobile.controller';
import { MobileGoogleAuthController } from './mobile/google-auth.mobile.controller';
import { GoogleAuthService } from './mobile/services/google-auth.service';
import { AuthCookieService } from './shared/services/auth-cookie.service';
import { AuthService } from './shared/services/auth.service';
import { EmailDeliveryService } from './shared/services/email-delivery.service';
import { EmailVerificationService } from './shared/services/email-verification.service';
import { PasswordService } from './shared/services/password.service';
import { SessionService } from './shared/services/session.service';
import { SessionNotificationService } from './shared/services/session-notification.service';
import { TokenService } from './shared/services/token.service';
import { TokenVersionService } from './shared/services/token-version.service';
import { AccessTokenGuard } from './shared/guards/access-token.guard';
import { PlatformRoleGuard } from './shared/guards/platform-role.guard';

@Module({
  imports: [
    JwtModule.register({}),
    forwardRef(() => AuditModule),
    forwardRef(() => PermissionsModule),
  ],
  controllers: [
    AdminAuthController,
    MobileAuthController,
    MobileGoogleAuthController,
  ],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    SessionService,
    SessionNotificationService,
    AuthCookieService,
    TokenVersionService,
    EmailVerificationService,
    EmailDeliveryService,
    GoogleAuthService,
    AccessTokenGuard,
    PlatformRoleGuard,
  ],
  exports: [
    AuthService,
    AccessTokenGuard,
    PlatformRoleGuard,
    TokenService,
    SessionService,
    TokenVersionService,
  ],
})
export class AuthModule {}
