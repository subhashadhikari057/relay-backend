import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminWorkspaceController } from './admin/workspace.admin.controller';
import { WorkspaceAdminService } from './admin/workspace.admin.service';
import { MobileWorkspaceController } from './mobile/workspace.mobile.controller';
import { WorkspaceMobileService } from './mobile/workspace.mobile.service';
import { WorkspaceRoleGuard } from './shared/guards/workspace-role.guard';
import { WorkspacePolicyService } from './shared/services/workspace-policy.service';

@Module({
  imports: [AuthModule],
  controllers: [MobileWorkspaceController, AdminWorkspaceController],
  providers: [
    WorkspaceMobileService,
    WorkspaceAdminService,
    WorkspacePolicyService,
    WorkspaceRoleGuard,
  ],
  exports: [WorkspacePolicyService],
})
export class WorkspacesModule {}
