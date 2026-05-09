import { PrismaClient, KycLevel, KycStatus, Prisma, UserRole, VerifiedTier } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@getx.gg';
const ADMIN_PASSWORD = 'Admin@GetX2026';
const DEMO_PASSWORD = 'Demo@2026';

async function main() {
  console.log('Seeding GETX database...');

  // ── Admin ──────────────────────────────────────────────────────
  console.log('  · admin user');
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      password: adminHash,
      name: 'GETX Admin',
      role: UserRole.SUPER_ADMIN,
      country: 'IN',
      emailVerified: new Date(),
      kycStatus: KycStatus.VERIFIED,
      kycLevel: KycLevel.LEVEL_3,
      isVerified: true,
      verifiedTier: VerifiedTier.ELITE,
      onboardingCompleted: true,
    },
  });

  // ── Games ──────────────────────────────────────────────────────
  console.log('  · games (Pokemon GO, Roblox)');
  const pokemonGoFields: Prisma.InputJsonValue = {
    tabs: [
      { slug: 'accounts', name: 'Accounts', type: 'BROWSE', icon: '👤' },
      { slug: 'top-ups', name: 'Top Ups', type: 'BROWSE', icon: '💰' },
      { slug: 'items', name: 'Items', type: 'BROWSE', icon: '📦' },
      { slug: 'boosting', name: 'Boosting', type: 'REVERSE', icon: '⚡' },
    ],
    boostingServices: [
      { slug: 'level-up', name: 'Level Up', icon: '⬆️' },
      { slug: 'xp-boost', name: 'XP Boost', icon: '⚡' },
      { slug: 'stardust-farming', name: 'Stardust Farming', icon: '✨' },
      { slug: 'raid-service', name: 'Raid Service', icon: '⚔️' },
      { slug: 'shiny-hunting', name: 'Shiny Hunting', icon: '🌟' },
      { slug: 'legendary-catch', name: 'Legendary Catch', icon: '🦅' },
      { slug: 'event-grinding', name: 'Event Grinding', icon: '🎁' },
    ],
  };

  await prisma.game.upsert({
    where: { slug: 'pokemon-go' },
    update: { fieldsConfig: pokemonGoFields },
    create: {
      slug: 'pokemon-go',
      name: 'Pokemon GO',
      shortName: 'PoGO',
      description:
        'Catch them all. Pokemon GO marketplace for accounts, items, and boosting services.',
      icon: 'https://cdn.getx.gg/games/pokemon-go-icon.png',
      banner: 'https://cdn.getx.gg/games/pokemon-go-banner.png',
      isActive: true,
      isLaunched: true,
      launchedAt: new Date(),
      sortOrder: 1,
      seoTitle: 'Pokemon GO Marketplace — Accounts, Items, Boosting | GETX',
      seoDescription:
        'Buy & sell Pokemon GO accounts, PokéCoins, items, and boosting services. Verified sellers, secure escrow, instant delivery.',
      fieldsConfig: pokemonGoFields,
    },
  });

  await prisma.game.upsert({
    where: { slug: 'roblox' },
    update: {},
    create: {
      slug: 'roblox',
      name: 'Roblox',
      shortName: 'Roblox',
      description: 'Roblox marketplace coming soon. Get notified at launch.',
      icon: 'https://cdn.getx.gg/games/roblox-icon.png',
      isActive: false,
      isLaunched: false,
      comingSoonAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sortOrder: 2,
      seoTitle: 'Roblox Marketplace — Coming Soon | GETX',
      fieldsConfig: { tabs: [] } as Prisma.InputJsonValue,
    },
  });

  // ── Demo sellers ───────────────────────────────────────────────
  console.log('  · 5 demo sellers (IN, KYC verified)');
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const sellers: Array<{ email: string; name: string; tier: VerifiedTier }> = [
    { email: 'seller1@demo.getx.gg', name: 'PokeMaster_IN', tier: VerifiedTier.PREMIUM },
    { email: 'seller2@demo.getx.gg', name: 'TrainerProfi', tier: VerifiedTier.VERIFIED },
    { email: 'seller3@demo.getx.gg', name: 'RaidLegend', tier: VerifiedTier.ELITE },
    { email: 'seller4@demo.getx.gg', name: 'ShinyHunter', tier: VerifiedTier.BASIC },
    { email: 'seller5@demo.getx.gg', name: 'StardustKing', tier: VerifiedTier.PREMIUM },
  ];

  // Deterministic ratings/sales so seed is idempotent (not Math.random)
  const sellerStats: Record<VerifiedTier, { rating: number; sales: number; completion: number }> = {
    BASIC: { rating: 4.5, sales: 12, completion: 95 },
    VERIFIED: { rating: 4.7, sales: 45, completion: 97 },
    PREMIUM: { rating: 4.85, sales: 120, completion: 98.5 },
    ELITE: { rating: 4.95, sales: 320, completion: 99.2 },
  };

  for (const seller of sellers) {
    const stats = sellerStats[seller.tier];
    await prisma.user.upsert({
      where: { email: seller.email },
      update: {},
      create: {
        email: seller.email,
        password: demoHash,
        name: seller.name,
        username: seller.name.toLowerCase(),
        role: UserRole.BOTH,
        country: 'IN',
        emailVerified: new Date(),
        kycStatus: KycStatus.VERIFIED,
        kycLevel: KycLevel.LEVEL_2,
        kycProvider: 'sumsub',
        kycVerifiedAt: new Date(),
        isSeller: true,
        sellerActivatedAt: new Date(),
        isVerified: true,
        verifiedTier: seller.tier,
        sellerRating: stats.rating,
        totalSales: stats.sales,
        completionRate: stats.completion,
        onboardingCompleted: true,
      },
    });
  }

  // ── Demo buyers ────────────────────────────────────────────────
  console.log('  · 10 demo buyers (global, no KYC)');
  const buyers: Array<{ email: string; name: string; country: string }> = [
    { email: 'buyer1@demo.getx.gg', name: 'GamerUS_001', country: 'US' },
    { email: 'buyer2@demo.getx.gg', name: 'UKTrainer', country: 'GB' },
    { email: 'buyer3@demo.getx.gg', name: 'CanadianCatcher', country: 'CA' },
    { email: 'buyer4@demo.getx.gg', name: 'AusieGamer', country: 'AU' },
    { email: 'buyer5@demo.getx.gg', name: 'EUMaster', country: 'DE' },
    { email: 'buyer6@demo.getx.gg', name: 'TokyoTrainer', country: 'JP' },
    { email: 'buyer7@demo.getx.gg', name: 'SeoulSavant', country: 'KR' },
    { email: 'buyer8@demo.getx.gg', name: 'BrazilianBuyer', country: 'BR' },
    { email: 'buyer9@demo.getx.gg', name: 'FrenchFinder', country: 'FR' },
    { email: 'buyer10@demo.getx.gg', name: 'SingaporeStar', country: 'SG' },
  ];

  for (const buyer of buyers) {
    await prisma.user.upsert({
      where: { email: buyer.email },
      update: {},
      create: {
        email: buyer.email,
        password: demoHash,
        name: buyer.name,
        username: buyer.name.toLowerCase(),
        role: UserRole.BUYER,
        country: buyer.country,
        emailVerified: new Date(),
        kycStatus: KycStatus.NONE,
        kycLevel: KycLevel.LEVEL_0,
        onboardingCompleted: true,
      },
    });
  }

  console.log('\nSeed complete.');
  console.log('  1 super admin · 2 games · 5 sellers · 10 buyers');
  console.log(`\nAdmin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Demo users:  *@demo.getx.gg / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((e: unknown) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
