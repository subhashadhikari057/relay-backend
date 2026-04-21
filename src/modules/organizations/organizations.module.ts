import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminOrganizationController } from './admin/organization.admin.controller';
import { OrganizationAdminService } from './admin/organization.admin.service';
import { MobileOrganizationController } from './mobile/organization.mobile.controller';
import { OrganizationMobileService } from './mobile/organization.mobile.service';
import { OrganizationRoleGuard } from './shared/guards/organization-role.guard';
import { OrganizationPolicyService } from './shared/services/organization-policy.service';

@Module({
  imports: [AuthModule],
  controllers: [MobileOrganizationController, AdminOrganizationController],
  providers: [
    OrganizationMobileService,
    OrganizationAdminService,
    OrganizationPolicyService,
    OrganizationRoleGuard,
  ],
})
export class OrganizationsModule {}
