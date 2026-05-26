/**
 * Production seed — idempotent, safe to run on a live database.
 *
 * Seeds:
 *   1. Pokemon GO game definition (with full fieldsConfig)
 *   2. Roblox stub (inactive — placeholder for game #2)
 *   3. SUPER_ADMIN user (only when SEED_ADMIN_PASSWORD env is set, and
 *      only if no admin already exists)
 *
 * Does NOT seed demo users, listings, or requests. Production starts
 * clean and fills with real data.
 *
 * Run with: pnpm --filter @getx/database seed:prod
 */
import { KycLevel, KycStatus, PrismaClient, Prisma, UserRole, VerifiedTier } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const POKEMON_GO_FIELDS: Prisma.InputJsonValue = {
  tabs: [
    { slug: 'accounts', name: 'Accounts', type: 'BROWSE', icon: '👤' },
    { slug: 'top-ups', name: 'Top Ups', type: 'BROWSE', icon: '💰' },
    { slug: 'items', name: 'Items', type: 'BROWSE', icon: '📦' },
    { slug: 'boosting', name: 'Boosting', type: 'REVERSE', icon: '⚡' },
  ],
  boostingServices: [
    { slug: 'level-up', name: 'Level Up', icon: '⬆️' },
    { slug: 'grunts-boost', name: 'Grunts Boost', icon: '⚡' },
    { slug: 'stardust-farming', name: 'Stardust Farming', icon: '✨' },
    { slug: 'raid-service', name: 'Raid Service', icon: '⚔️' },
    { slug: 'shiny-hunting', name: 'Shiny Hunting', icon: '🌟' },
    { slug: 'legendary-catch', name: 'Legendary Catch', icon: '🦅' },
    { slug: 'event-grinding', name: 'Event Grinding', icon: '🎁' },
  ],
};

async function seedGames() {
  await prisma.game.upsert({
    where: { slug: 'pokemon-go' },
    update: {
      name: 'Pokemon GO',
      isActive: true,
      isLaunched: true,
      fieldsConfig: POKEMON_GO_FIELDS,
    },
    create: {
      slug: 'pokemon-go',
      name: 'Pokemon GO',
      shortName: 'PoGO',
      description:
        "The world's biggest AR mobile game. Buy accounts, top-ups, items, and expert boosting services.",
      icon: 'https://cdn.getx.gg/games/pokemon-go-icon.png',
      banner: 'https://cdn.getx.gg/games/pokemon-go-banner.png',
      isActive: true,
      isLaunched: true,
      launchedAt: new Date(),
      sortOrder: 1,
      fieldsConfig: POKEMON_GO_FIELDS,
    },
  });
  console.log('  ✓ Pokemon GO');

  await prisma.game.upsert({
    where: { slug: 'roblox' },
    update: {},
    create: {
      slug: 'roblox',
      name: 'Roblox',
      shortName: 'Roblox',
      description: 'User-created universe. Coming soon.',
      icon: 'https://cdn.getx.gg/games/roblox-icon.png',
      isActive: false,
      isLaunched: false,
      sortOrder: 2,
      // fieldsConfig is required — empty stub until launch.
      fieldsConfig: { tabs: [], boostingServices: [] } satisfies Prisma.InputJsonValue,
    },
  });
  console.log('  ✓ Roblox (inactive stub)');
}

async function seedAdmin() {
  const existing = await prisma.user.findFirst({
    where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
    select: { id: true, email: true, role: true },
  });
  if (existing) {
    console.log(`  ✓ Admin already exists: ${existing.email} (${existing.role})`);
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@getx.gg';
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    console.warn(
      '  ⚠ SEED_ADMIN_PASSWORD not set — skipping admin creation. ' +
        'Set the env var and re-run, or create the admin via Prisma Studio.',
    );
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      password: hash,
      name: 'GETX Admin',
      username: 'admin',
      country: 'IN',
      role: UserRole.SUPER_ADMIN,
      emailVerified: new Date(),
      kycStatus: KycStatus.VERIFIED,
      kycLevel: KycLevel.LEVEL_3,
      isVerified: true,
      verifiedTier: VerifiedTier.ELITE,
      onboardingCompleted: true,
    },
    select: { id: true, email: true, role: true },
  });
  console.log(`  ✓ Admin created: ${admin.email} (${admin.role})`);
}

async function main() {
  console.log('🌱 GETX production seed');
  console.log('  · games');
  await seedGames();
  console.log('  · admin');
  await seedAdmin();
  console.log('✅ Production seed complete');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
