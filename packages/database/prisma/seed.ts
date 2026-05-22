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
  /* Boosting services nest inside the Boosting tab's subServices array
     — the consumer (web boosting hub page + games.service.getServiceConfig)
     reads `tabs[i].subServices`, not a top-level boostingServices key.
     Previously seeded as top-level which left /games/pokemon-go/boosting
     showing the empty-state copy ("launching with next patch") despite
     the services existing. */
  const pokemonGoFields: Prisma.InputJsonValue = {
    tabs: [
      { slug: 'accounts', name: 'Accounts', type: 'BROWSE', icon: '👤' },
      { slug: 'top-ups', name: 'Top Ups', type: 'BROWSE', icon: '💰' },
      { slug: 'items', name: 'Items', type: 'BROWSE', icon: '📦' },
      {
        slug: 'boosting',
        name: 'Boosting',
        type: 'REVERSE',
        icon: '⚡',
        tagline: 'Get expert boosters in under 2 minutes',
        description: 'Fill the form, sellers bid, you choose the best offer.',
        subServices: [
          {
            slug: 'level-up',
            name: 'Level Up',
            icon: '⬆️',
            description: 'Level up your Pokemon GO trainer fast',
            estimatedTime: '1-7 days',
          },
          {
            slug: 'xp-boost',
            name: 'XP Boost',
            icon: '⚡',
            description: 'Bulk XP grinding through events and lucky eggs',
            estimatedTime: '1-3 days',
          },
          {
            slug: 'stardust-farming',
            name: 'Stardust Farming',
            icon: '✨',
            description: 'Stockpile stardust for powering up your roster',
            estimatedTime: '2-5 days',
          },
          {
            slug: 'raid-service',
            name: 'Raid Service',
            icon: '⚔️',
            description: 'Tier 5 raids and special research completion',
            estimatedTime: '1-2 days',
          },
          {
            slug: 'shiny-hunting',
            name: 'Shiny Hunting',
            icon: '🌟',
            description: 'Targeted shiny catches during community days and events',
            estimatedTime: '1-7 days',
          },
          {
            slug: 'legendary-catch',
            name: 'Legendary Catch',
            icon: '🦅',
            description: 'Catch any active legendary with guaranteed completion',
            estimatedTime: '1-3 days',
          },
          {
            slug: 'event-grinding',
            name: 'Event Grinding',
            icon: '🎁',
            description: 'Full event ticket completion, no missed bonuses',
            estimatedTime: 'event duration',
          },
        ],
      },
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
  console.log('  · 5 demo sellers (global, Sumsub-verified)');
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  /* Seller bios — written like real-world top marketplace profiles
     (Eldorado / PlayerAuctions reference). Each one names a specialty,
     a delivery promise, and one personal-touch line. Countries diversified
     post global pivot (was all India). */
  const sellers: Array<{
    email: string;
    name: string;
    username: string;
    tier: VerifiedTier;
    country: string;
    bio: string;
  }> = [
    {
      email: 'seller1@demo.getx.gg',
      name: 'Rio Aoyama',
      username: 'rio.gg',
      tier: VerifiedTier.PREMIUM,
      country: 'JP',
      bio: "Tokyo-based PoGo veteran since launch. I source clean OG 2018-2020 accounts only — no recovery flags, all PTC + Google linked and unlinked on transfer. Median ship time under 8 minutes. If you're after a specific team/level combo, message me before you buy.",
    },
    {
      email: 'seller2@demo.getx.gg',
      name: 'Luca Bianchi',
      username: 'luca',
      tier: VerifiedTier.VERIFIED,
      country: 'IT',
      bio: 'PokéCoin top-ups, auto-delivered. I run a small Milan-based outfit with my brother. We use only verified payment rails, never reseller risk. Coins land in your account before you finish reading this bio.',
    },
    {
      email: 'seller3@demo.getx.gg',
      name: 'Aria Chen',
      username: 'aria.pkmn',
      tier: VerifiedTier.ELITE,
      country: 'SG',
      bio: 'Master League rank pushes a specialty. 4+ years of competitive PoGo PvP, peaked Legend 5 times. I stream every boost end-to-end so you see exactly what I do. Singapore timezone, 24/7 chat support.',
    },
    {
      email: 'seller4@demo.getx.gg',
      name: 'Maya Patel',
      username: 'maya',
      tier: VerifiedTier.BASIC,
      country: 'CA',
      bio: 'Shiny hunter, Toronto. New on GetX but verified through Sumsub and shipping same-day. Specialise in regionals and shiny legendaries. Ask me about full Pokedex 80%+ accounts.',
    },
    {
      email: 'seller5@demo.getx.gg',
      name: 'Kai Müller',
      username: 'kai',
      tier: VerifiedTier.PREMIUM,
      country: 'DE',
      bio: 'Berlin · raid passes, item bundles, event gear. I keep stock fresh — every drop ships within an hour of buyer confirmation. Bulk discounts available for raid groups (3+ orders).',
    },
  ];

  /* Deterministic ratings/sales so seed stays idempotent — no randomness. */
  const sellerStats: Record<VerifiedTier, { rating: number; sales: number; completion: number }> = {
    BASIC: { rating: 4.62, sales: 18, completion: 96.5 },
    VERIFIED: { rating: 4.78, sales: 64, completion: 97.8 },
    PREMIUM: { rating: 4.88, sales: 142, completion: 98.6 },
    ELITE: { rating: 4.96, sales: 384, completion: 99.4 },
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
        username: seller.username,
        bio: seller.bio,
        role: UserRole.BOTH,
        country: seller.country,
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
