import { PrismaClient, Prisma } from '@prisma/client';
import { gameRegistry } from '@getx/games';

const prisma = new PrismaClient();

async function syncGames() {
  console.log('Syncing games to database...');

  for (const [slug, config] of Object.entries(gameRegistry)) {
    const fieldsConfig = JSON.parse(JSON.stringify(config)) as Prisma.InputJsonValue;

    const game = await prisma.game.upsert({
      where: { slug },
      create: {
        slug: config.slug,
        name: config.name,
        shortName: config.shortName,
        description: config.description,
        icon: config.icon,
        banner: config.banner,
        isActive: config.isActive,
        isLaunched: config.isLaunched,
        launchedAt: config.isLaunched ? new Date() : null,
        sortOrder: config.sortOrder,
        seoTitle: `${config.name} Marketplace - Accounts, Items, Boosting | GETX`,
        seoDescription: config.description,
        fieldsConfig,
      },
      update: {
        name: config.name,
        shortName: config.shortName,
        description: config.description,
        icon: config.icon,
        banner: config.banner,
        isActive: config.isActive,
        isLaunched: config.isLaunched,
        sortOrder: config.sortOrder,
        seoTitle: `${config.name} Marketplace - Accounts, Items, Boosting | GETX`,
        seoDescription: config.description,
        fieldsConfig,
      },
    });

    console.log(`  ${game.slug}: ${config.tabs.length} tabs synced`);
  }

  console.log('Game sync complete.');
}

syncGames()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
