/* eslint-disable no-console */
const { PrismaPg } = require('@prisma/adapter-pg');
const {
  PrismaClient,
  OrganizationRole,
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

  const organization = await prisma.organization.upsert({
    where: { slug: 'relay-user-org' },
    update: {
      name: 'Relay User Organization',
      description: 'Default seeded organization for user@relay.com',
      createdById: user.id,
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: 'Relay User Organization',
      slug: 'relay-user-org',
      description: 'Default seeded organization for user@relay.com',
      createdById: user.id,
      isActive: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      role: OrganizationRole.owner,
      isActive: true,
      invitedById: null,
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: OrganizationRole.owner,
      isActive: true,
      invitedById: null,
    },
  });

  const upsertPolicy = async ({ scope, organizationId = null, role, resource, mask }) => {
    const existing = await prisma.permissionPolicy.findFirst({
      where: {
        scope,
        organizationId,
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
        organizationId,
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
    [PermissionPolicyRole.superadmin, 'platform.organizations', ALL],
    [PermissionPolicyRole.superadmin, 'platform.audit', ALL],
    [PermissionPolicyRole.superadmin, 'platform.upload', ALL],
    [PermissionPolicyRole.superadmin, 'platform.permissions', ALL],
    [PermissionPolicyRole.user, 'platform.auth', 0],
    [PermissionPolicyRole.user, 'platform.organizations', 0],
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
    [PermissionPolicyRole.owner, 'org.organization', ALL],
    [PermissionPolicyRole.owner, 'org.invite', ALL],
    [PermissionPolicyRole.owner, 'org.member', ALL],
    [PermissionPolicyRole.owner, 'org.activity', READ],
    [PermissionPolicyRole.owner, 'org.permissions', ALL],
    [PermissionPolicyRole.admin, 'org.organization', READ | UPDATE],
    [PermissionPolicyRole.admin, 'org.invite', READ | WRITE | DELETE],
    [PermissionPolicyRole.admin, 'org.member', READ | UPDATE | DELETE],
    [PermissionPolicyRole.admin, 'org.activity', READ],
    [PermissionPolicyRole.admin, 'org.permissions', 0],
    [PermissionPolicyRole.member, 'org.organization', READ],
    [PermissionPolicyRole.member, 'org.invite', 0],
    [PermissionPolicyRole.member, 'org.member', READ],
    [PermissionPolicyRole.member, 'org.activity', READ],
    [PermissionPolicyRole.member, 'org.permissions', 0],
    [PermissionPolicyRole.guest, 'org.organization', READ],
    [PermissionPolicyRole.guest, 'org.invite', 0],
    [PermissionPolicyRole.guest, 'org.member', READ],
    [PermissionPolicyRole.guest, 'org.activity', READ],
    [PermissionPolicyRole.guest, 'org.permissions', 0],
  ];

  for (const [role, resource, mask] of orgPolicies) {
    await upsertPolicy({
      scope: PermissionPolicyScope.organization,
      organizationId: organization.id,
      role,
      resource,
      mask,
    });
  }

  console.log(`Seeded superadmin user: ${superadmin.email}`);
  console.log(`Seeded user: ${user.email}`);
  console.log(
    `Seeded organization: ${organization.name} (slug=${organization.slug})`,
  );
  console.log('Seeded baseline permission policies for platform and seeded organization.');
}

main()
  .catch((error) => {
    console.error('Failed to run seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
