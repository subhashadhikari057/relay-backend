import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditService } from './audit.service';
import { AuditAdminController } from './admin/audit.admin.controller';
import { AuditMobileController } from './mobile/audit.mobile.controller';
import { AuditEventFactory } from './shared/audit-event-factory.service';

@Global()
@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [AuditAdminController, AuditMobileController],
  providers: [AuditService, AuditEventFactory],
  exports: [AuditService, AuditEventFactory],
})
export class AuditModule {}
