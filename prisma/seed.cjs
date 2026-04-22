/* eslint-disable no-console */
const { PrismaPg } = require('@prisma/adapter-pg');
const {
  PrismaClient,
  WorkspaceRole,
  PermissionPolicyRole,
  PermissionPolicyScope,
  PlatformRole,
} = require('@prisma/client');
const argon2 = require('argon2');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run seed.');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const superadminEmail = 'superadmin@relay.com';
  const superadminPlainPassword = 'superadmin123';
  const superadminPasswordHash = await argon2.hash(superadminPlainPassword, {
    type: argon2.argon2id,
  });

  const superadmin = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {
      passwordHash: superadminPasswordHash,
      fullName: 'Relay Superadmin',
      displayName: 'Superadmin',
      platformRole: PlatformRole.superadmin,
      isActive: true,
      tokenVersion: 1,
    },
    create: {
      email: superadminEmail,
      passwordHash: superadminPasswordHash,
      fullName: 'Relay Superadmin',
      displayName: 'Superadmin',
      platformRole: PlatformRole.superadmin,
      isActive: true,
      tokenVersion: 1,
    },
  });

  const userEmail = 'user@relay.com';
  const userPlainPassword = 'userpassword123';
  const userPasswordHash = await argon2.hash(userPlainPassword, {
    type: argon2.argon2id,
  });

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      passwordHash: userPasswordHash,
      fullName: 'Relay User',
      displayName: 'User',
      platformRole: PlatformRole.user,
      isActive: true,
      tokenVersion: 1,
    },
    create: {
      email: userEmail,
      passwordHash: userPasswordHash,
      fullName: 'Relay User',
      displayName: 'User',
      platformRole: PlatformRole.user,
      isActive: true,
      tokenVersion: 1,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'relay-user-org' },
    update: {
      name: 'Relay User Workspace',
      description: 'Default seeded workspace for user@relay.com',
      createdById: user.id,
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: 'Relay User Workspace',
      slug: 'relay-user-org',
      description: 'Default seeded workspace for user@relay.com',
      createdById: user.id,
      isActive: true,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {
      role: WorkspaceRole.owner,
      isActive: true,
      invitedById: null,
    },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: WorkspaceRole.owner,
      isActive: true,
      invitedById: null,
    },
  });

  const upsertPolicy = async ({ scope, workspaceId = null, role, resource, mask }) => {
    const existing = await prisma.permissionPolicy.findFirst({
      where: {
        scope,
        workspaceId,
        role,
        resource,
      },
    });

    if (existing) {
      await prisma.permissionPolicy.update({
        where: { id: existing.id },
        data: { mask },
      });
      return;
    }

    await prisma.permissionPolicy.create({
      data: {
        scope,
        workspaceId,
        role,
        resource,
        mask,
      },
    });
  };

  const ALL = 15;
  const READ = 1;
  const WRITE = 2;
  const UPDATE = 4;
  const DELETE = 8;

  const platformPolicies = [
    [PermissionPolicyRole.superadmin, 'platform.auth', ALL],
    [PermissionPolicyRole.superadmin, 'platform.workspaces', ALL],
    [PermissionPolicyRole.superadmin, 'platform.audit', ALL],
    [PermissionPolicyRole.superadmin, 'platform.upload', ALL],
    [PermissionPolicyRole.superadmin, 'platform.permissions', ALL],
    [PermissionPolicyRole.user, 'platform.auth', 0],
    [PermissionPolicyRole.user, 'platform.workspaces', 0],
    [PermissionPolicyRole.user, 'platform.audit', 0],
    [PermissionPolicyRole.user, 'platform.upload', 0],
    [PermissionPolicyRole.user, 'platform.permissions', 0],
  ];

  for (const [role, resource, mask] of platformPolicies) {
    await upsertPolicy({
      scope: PermissionPolicyScope.platform,
      role,
      resource,
      mask,
    });
  }

  const orgPolicies = [
    [PermissionPolicyRole.owner, 'workspace.workspace', ALL],
    [PermissionPolicyRole.owner, 'workspace.invite', ALL],
    [PermissionPolicyRole.owner, 'workspace.member', ALL],
    [PermissionPolicyRole.owner, 'workspace.activity', READ],
    [PermissionPolicyRole.owner, 'workspace.permissions', ALL],
    [PermissionPolicyRole.admin, 'workspace.workspace', READ | UPDATE],
    [PermissionPolicyRole.admin, 'workspace.invite', READ | WRITE | DELETE],
    [PermissionPolicyRole.admin, 'workspace.member', READ | UPDATE | DELETE],
    [PermissionPolicyRole.admin, 'workspace.activity', READ],
    [PermissionPolicyRole.admin, 'workspace.permissions', 0],
    [PermissionPolicyRole.member, 'workspace.workspace', READ],
    [PermissionPolicyRole.member, 'workspace.invite', 0],
    [PermissionPolicyRole.member, 'workspace.member', READ],
    [PermissionPolicyRole.member, 'workspace.activity', READ],
    [PermissionPolicyRole.member, 'workspace.permissions', 0],
    [PermissionPolicyRole.guest, 'workspace.workspace', READ],
    [PermissionPolicyRole.guest, 'workspace.invite', 0],
    [PermissionPolicyRole.guest, 'workspace.member', READ],
    [PermissionPolicyRole.guest, 'workspace.activity', READ],
    [PermissionPolicyRole.guest, 'workspace.permissions', 0],
  ];

  for (const [role, resource, mask] of orgPolicies) {
    await upsertPolicy({
      scope: PermissionPolicyScope.workspace,
      workspaceId: workspace.id,
      role,
      resource,
      mask,
    });
  }

  console.log(`Seeded superadmin user: ${superadmin.email}`);
  console.log(`Seeded user: ${user.email}`);
  console.log(
    `Seeded workspace: ${workspace.name} (slug=${workspace.slug})`,
  );
  console.log('Seeded baseline permission policies for platform and seeded workspace.');
}

main()
  .catch((error) => {
    console.error('Failed to run seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
