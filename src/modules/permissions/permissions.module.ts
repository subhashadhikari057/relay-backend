import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsAdminController } from './admin/permissions.admin.controller';
import { PermissionGuard } from './guards/permission.guard';
import { PermissionsMobileController } from './mobile/permissions.mobile.controller';
import { PermissionsPolicyService } from './services/permissions-policy.service';
import { PermissionsUpdateOrchestratorService } from './services/permissions-update-orchestrator.service';

@Global()
@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [PermissionsAdminController, PermissionsMobileController],
  providers: [
    PermissionsPolicyService,
    PermissionsUpdateOrchestratorService,
    PermissionGuard,
  ],
  exports: [PermissionsPolicyService, PermissionGuard],
})
export class PermissionsModule {}
