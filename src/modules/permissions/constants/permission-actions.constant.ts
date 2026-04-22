export enum PermissionAction {
  read = 'read',
  write = 'write',
  update = 'update',
  delete = 'delete',
}

export const PermissionBits = {
  [PermissionAction.read]: 1,
  [PermissionAction.write]: 2,
  [PermissionAction.update]: 4,
  [PermissionAction.delete]: 8,
} as const;

export const ALL_PERMISSION_BITS =
  PermissionBits[PermissionAction.read] |
  PermissionBits[PermissionAction.write] |
  PermissionBits[PermissionAction.update] |
  PermissionBits[PermissionAction.delete];

export function hasPermissionBit(mask: number, action: PermissionAction) {
  return (mask & PermissionBits[action]) === PermissionBits[action];
}
