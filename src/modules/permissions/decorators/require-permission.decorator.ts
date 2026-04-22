import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '../constants/permission-actions.constant';
import { PermissionScope } from '../constants/permission-scope.constant';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

export type RequiredPermissionMetadata = {
  scope: PermissionScope;
  resource: string;
  action: PermissionAction;
};

export const RequirePermission = (input: RequiredPermissionMetadata) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, input);
