import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SystemMessagesModule } from '../system-messages/system-messages.module';
import { OnboardingMobileController } from './mobile/onboarding.mobile.controller';
import { OnboardingMobileService } from './mobile/onboarding.mobile.service';

@Module({
  imports: [AuthModule, AuditModule, PermissionsModule, SystemMessagesModule],
  controllers: [OnboardingMobileController],
  providers: [OnboardingMobileService],
})
export class OnboardingModule {}
