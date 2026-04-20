/* eslint-disable no-console */
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, PlatformRole } = require('@prisma/client');
const argon2 = require('argon2');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run seed.');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'superadmin@relay.com';
  const plainPassword = 'superadmin123';
  const passwordHash = await argon2.hash(plainPassword, {
    type: argon2.argon2id,
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      fullName: 'Relay Superadmin',
      displayName: 'Superadmin',
      platformRole: PlatformRole.superadmin,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      fullName: 'Relay Superadmin',
      displayName: 'Superadmin',
      platformRole: PlatformRole.superadmin,
      isActive: true,
    },
  });

  console.log(`Seeded superadmin user: ${user.email}`);
}

main()
  .catch((error) => {
    console.error('Failed to seed superadmin user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
