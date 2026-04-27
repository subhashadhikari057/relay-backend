import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { SystemMessagesModule } from '../system-messages/system-messages.module';
import { AdminWorkspaceController } from './admin/workspace.admin.controller';
import { WorkspaceAdminService } from './admin/workspace.admin.service';
import { MobileWorkspaceController } from './mobile/workspace.mobile.controller';
import { WorkspaceMobileService } from './mobile/workspace.mobile.service';
import { WorkspaceRoleGuard } from './shared/guards/workspace-role.guard';
import { WorkspacePolicyService } from './shared/services/workspace-policy.service';

@Module({
  imports: [AuthModule, SystemMessagesModule, EmailModule],
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
