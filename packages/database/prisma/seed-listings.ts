import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function seedListings() {
  console.log('Seeding demo listings + custom requests...');

  const pokemonGo = await prisma.game.findUnique({ where: { slug: 'pokemon-go' } });
  if (!pokemonGo) {
    throw new Error('Pokemon GO game not found. Run db:sync-games first.');
  }

  const sellers = await prisma.user.findMany({
    where: { email: { endsWith: '@demo.getx.gg' }, role: { in: ['SELLER', 'BOTH'] } },
    take: 5,
  });
  if (sellers.length === 0) {
    throw new Error('No demo sellers found. Run db:seed first.');
  }

  for (const seller of sellers) {
    if (!seller.isSeller) {
      await prisma.user.update({
        where: { id: seller.id },
        data: { isSeller: true, sellerActivatedAt: new Date() },
      });
    }
  }

  // Idempotency: wipe demo listings + requests for this game first.
  const wipedListings = await prisma.productListing.deleteMany({
    where: { gameId: pokemonGo.id, sku: { startsWith: 'GTX-PG-' } },
  });
  const wipedRequests = await prisma.customRequest.deleteMany({
    where: { gameId: pokemonGo.id, requestNumber: { startsWith: 'CR-DEMO-' } },
  });
  console.log(
    `  Cleared ${wipedListings.count} prior demo listings, ${wipedRequests.count} demo requests`,
  );

  console.log(`  Found ${sellers.length} sellers, game: ${pokemonGo.name}`);

  // ─── ACCOUNTS (5) ──────────────────────────────────────
  /* Each listing has a sharp scannable title (level + team + headline
     achievement), a buyer-focused description (what's in the account +
     transfer method + ban-risk note), and verified attribute counts. */
  const accountsData = [
    {
      title: 'Lv 40 Mystic · 142 shinies · All legendaries',
      description:
        "OG 2018 Mystic trainer with a full Kanto-to-Galar legendary pile, 142 verified shinies, and 8 hundo-IV mons including Mewtwo and Rayquaza. PTC + Google linked; recovery email & 2FA reset bundled at transfer. Zero recovery flags, no prior trades. Ships in under 10 minutes after escrow lock.",
      price: 299,
      level: 40,
      team: 'Mystic',
      shinyCount: 142,
      legendaryCount: 35,
      hundoCount: 8,
    },
    {
      title: 'Lv 50 Valor · Master Trainer ×12',
      description:
        "Endgame Valor with 12 Master Trainer titles and a full GBL Master League roster (Giratina-O, Dialga, Mewtwo all level 50). 89 shinies, 28 legendaries. Clean account, OG 2017. Comes with full transfer pack: PTC creds, Google delink, recovery email reset.",
      price: 449,
      level: 50,
      team: 'Valor',
      shinyCount: 89,
      legendaryCount: 28,
      masterTrainerCount: 12,
    },
    {
      title: 'Lv 35 Instinct · 5 mythicals + fresh start',
      description:
        "Sub-level account perfect for adding to an existing Instinct setup or starting fresh. 45 shinies, 5 mythicals (Mew, Celebi, Jirachi, Darkrai, Genesect). Account is clean, never traded. Ideal for boosters or alt-account buyers.",
      price: 189,
      level: 35,
      team: 'Instinct',
      shinyCount: 45,
      mythicalCount: 5,
    },
    {
      title: 'Lv 50 Mystic · PvP & raid endgame',
      description:
        "Top-tier Mystic optimised for PvP and Master League. 230 shinies, 50 legendaries, 18 hundos. All three battle leagues stocked with level 50 attackers. OG 2018, clean history, full transfer pack with email + 2FA reset. Premium tier — top 1% of GetX accounts.",
      price: 599,
      level: 50,
      team: 'Mystic',
      shinyCount: 230,
      legendaryCount: 50,
      hundoCount: 18,
    },
    {
      title: 'Lv 45 Valor · Shiny hunter special (312)',
      description:
        "Shiny-focused Valor with 312 verified shinies including community-day exclusives and regionals (Tropius, Heatmor, Pachirisu). 22 legendaries. Perfect for collectors. Transfer includes account swap to a clean recovery email and Google unlink.",
      price: 349,
      level: 45,
      team: 'Valor',
      shinyCount: 312,
      legendaryCount: 22,
    },
  ];

  for (let i = 0; i < accountsData.length; i++) {
    const data = accountsData[i]!;
    const seller = sellers[i % sellers.length]!;
    await prisma.productListing.create({
      data: {
        sku: `GTX-PG-ACC-${String(i + 1).padStart(4, '0')}`,
        sellerId: seller.id,
        gameId: pokemonGo.id,
        tabType: 'ACCOUNTS',
        productType: 'account',
        title: data.title,
        description: data.description,
        attributes: {
          ...data,
          region: 'Global',
          platform: 'iOS',
        } as Prisma.InputJsonValue,
        images: [],
        price: data.price,
        currency: 'USD',
        stock: 1,
        deliveryType: 'INSTANT',
        deliveryTime: 'Instant after payment',
        status: 'ACTIVE',
        slug: `lvl-${data.level}-${data.team.toLowerCase()}-${i + 1}`,
        searchTags: ['pokemon-go', data.team.toLowerCase(), `level-${data.level}`, 'shiny'],
      },
    });
  }

  // ─── TOP-UPS (5) ───────────────────────────────────────
  const topUpsData = [
    { amount: '100', price: 1.99 },
    { amount: '500', price: 9.99 },
    { amount: '1200', price: 19.99 },
    { amount: '2500', price: 39.99 },
    { amount: '5200', price: 79.99 },
  ];

  for (let i = 0; i < topUpsData.length; i++) {
    const data = topUpsData[i]!;
    const seller = sellers[i % sellers.length]!;
    await prisma.productListing.create({
      data: {
        sku: `GTX-PG-TOP-${String(i + 1).padStart(4, '0')}`,
        sellerId: seller.id,
        gameId: pokemonGo.id,
        tabType: 'TOP_UPS',
        productType: 'pokecoins',
        title: `${data.amount} PokéCoins`,
        description: `Get ${data.amount} PokéCoins delivered to your account. Fast & secure.`,
        attributes: {
          coinAmount: data.amount,
          deliveryMethod: 'Account login',
        } as Prisma.InputJsonValue,
        images: [],
        price: data.price,
        currency: 'USD',
        stock: -1,
        deliveryType: 'MANUAL',
        deliveryTime: 'Within 1 hour',
        status: 'ACTIVE',
        slug: `${data.amount}-pokecoins`,
        searchTags: ['pokemon-go', 'pokecoins', 'currency', data.amount],
      },
    });
  }

  // ─── ITEMS (5) ─────────────────────────────────────────
  const itemsData = [
    {
      title: 'Pokeball Mega Pack',
      types: ['Pokeballs', 'Great Balls', 'Ultra Balls'],
      qty: 500,
      price: 4.99,
      breakdown: '200 Pokeballs + 200 Great Balls + 100 Ultra Balls',
    },
    {
      title: 'Berry Bonanza',
      types: ['Razz Berries', 'Pinap Berries', 'Nanab Berries'],
      qty: 300,
      price: 3.5,
      breakdown: '100 each of Razz, Pinap, Nanab',
    },
    {
      title: 'Healer Bundle',
      types: ['Potions', 'Super Potions', 'Hyper Potions', 'Revives'],
      qty: 250,
      price: 5.99,
      breakdown: '100 Potions + 75 Super + 50 Hyper + 25 Revives',
    },
    {
      title: 'Premium Trainer Pack',
      types: ['Ultra Balls', 'Hyper Potions', 'Max Revives'],
      qty: 150,
      price: 9.99,
      breakdown: '100 Ultra Balls + 30 Hyper + 20 Max Revives',
    },
    {
      title: 'Beginner Pack',
      types: ['Pokeballs', 'Razz Berries', 'Potions'],
      qty: 200,
      price: 2.99,
      breakdown: '100 Pokeballs + 50 Razz + 50 Potions',
    },
  ];

  for (let i = 0; i < itemsData.length; i++) {
    const data = itemsData[i]!;
    const seller = sellers[i % sellers.length]!;
    await prisma.productListing.create({
      data: {
        sku: `GTX-PG-ITM-${String(i + 1).padStart(4, '0')}`,
        sellerId: seller.id,
        gameId: pokemonGo.id,
        tabType: 'ITEMS',
        productType: 'items-bundle',
        title: data.title,
        description: `${data.breakdown}. Delivered within 1 hour after payment.`,
        attributes: {
          itemTypes: data.types,
          totalQuantity: data.qty,
          breakdown: data.breakdown,
        } as Prisma.InputJsonValue,
        images: [],
        price: data.price,
        currency: 'USD',
        stock: -1,
        deliveryType: 'MANUAL',
        deliveryTime: 'Within 1 hour',
        status: 'ACTIVE',
        slug: data.title.toLowerCase().replace(/\s+/g, '-'),
        searchTags: ['pokemon-go', 'items', ...data.types.map((t) => t.toLowerCase())],
      },
    });
  }

  // ─── CUSTOM REQUESTS (3) ───────────────────────────────
  const buyers = await prisma.user.findMany({
    where: { email: { endsWith: '@demo.getx.gg' }, role: 'BUYER' },
    take: 3,
  });
  if (buyers.length === 0) {
    throw new Error('No demo buyers found. Run db:seed first.');
  }

  const requestsData: Array<{
    tabType: 'BOOSTING' | 'ACCOUNTS';
    subCategory?: string;
    title: string;
    description: string;
    budgetMin: number;
    budgetMax: number;
    attributes: Prisma.InputJsonValue;
    addons?: Prisma.InputJsonValue;
    deliveryDays: number;
  }> = [
    {
      tabType: 'BOOSTING',
      subCategory: 'level-up',
      title: 'Need Level 40 boost from Level 25',
      description:
        'Looking for fast level up service. Currently level 25, need to reach level 40 within a week. Account is iOS, US region.',
      budgetMin: 50,
      budgetMax: 100,
      attributes: { currentLevel: 25, desiredLevel: 40, platform: 'iOS' },
      addons: { stream: false, offlineMode: true, priorityDelivery: false },
      deliveryDays: 7,
    },
    {
      tabType: 'ACCOUNTS',
      title: 'Looking for Lvl 50+ Mystic with 200+ shinies',
      description:
        'Want a high-level Mystic account with at least 200 shinies and 30+ legendaries. PvP ready preferred. Budget flexible.',
      budgetMin: 400,
      budgetMax: 700,
      attributes: {
        team: 'Mystic',
        minLevel: 50,
        minShinies: 200,
        minLegendaries: 30,
      },
      deliveryDays: 14,
    },
    {
      tabType: 'BOOSTING',
      subCategory: 'shiny-hunting',
      title: 'Need 5 Shiny Mewtwo with 90+ IVs',
      description:
        'Looking for shiny Mewtwo (raid hunting). Need 5 catches with 90%+ IVs. Patient with quality.',
      budgetMin: 200,
      budgetMax: 400,
      attributes: {
        pokemonName: 'Mewtwo',
        numberOfShinies: 5,
        ivsRequired: '90+',
        method: 'Wild encounters',
      },
      deliveryDays: 14,
    },
  ];

  for (let i = 0; i < requestsData.length; i++) {
    const data = requestsData[i]!;
    const buyer = buyers[i % buyers.length]!;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.customRequest.create({
      data: {
        // CR-DEMO-* prefix so re-runs can wipe just our seeds without
        // touching real CR-2026-* requests created by users later.
        requestNumber: `CR-DEMO-${String(i + 1).padStart(5, '0')}`,
        buyerId: buyer.id,
        gameId: pokemonGo.id,
        tabType: data.tabType,
        subCategory: data.subCategory ?? null,
        title: data.title,
        description: data.description,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        currency: 'USD',
        attributes: data.attributes,
        addons: data.addons ?? Prisma.JsonNull,
        deliveryDays: data.deliveryDays,
        expiresAt,
        platform: 'iOS',
        status: 'OPEN',
        images: [],
      },
    });
  }

  // Refresh denormalized stats.
  const totalListings = await prisma.productListing.count({
    where: { gameId: pokemonGo.id, status: 'ACTIVE' },
  });
  const totalSellers = sellers.length;

  await prisma.game.update({
    where: { id: pokemonGo.id },
    data: { totalListings, totalSellers },
  });

  console.log(
    `Seeded: 5 accounts + 5 top-ups + 5 items + 3 custom requests; stats updated (${totalListings} listings, ${totalSellers} sellers).`,
  );
}

seedListings()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
