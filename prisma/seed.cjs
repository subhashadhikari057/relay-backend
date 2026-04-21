/* eslint-disable no-console */
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, OrganizationRole, PlatformRole } = require('@prisma/client');
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
    },
    create: {
      email: superadminEmail,
      passwordHash: superadminPasswordHash,
      fullName: 'Relay Superadmin',
      displayName: 'Superadmin',
      platformRole: PlatformRole.superadmin,
      isActive: true,
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
    },
    create: {
      email: userEmail,
      passwordHash: userPasswordHash,
      fullName: 'Relay User',
      displayName: 'User',
      platformRole: PlatformRole.user,
      isActive: true,
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

  console.log(`Seeded superadmin user: ${superadmin.email}`);
  console.log(`Seeded user: ${user.email}`);
  console.log(
    `Seeded organization: ${organization.name} (slug=${organization.slug})`,
  );
}

main()
  .catch((error) => {
    console.error('Failed to run seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
