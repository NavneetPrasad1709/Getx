/* One-shot prod patch: rewrite the pokemon-go Game.fieldsConfig row
   to nest boosting services inside the Boosting tab's subServices array.
   Earlier seed put them at top-level `boostingServices` which the
   consumer (web boosting hub + games.service.getServiceConfig) never
   reads, so /games/pokemon-go/boosting showed the empty-state copy.

   Run with:  pnpm --filter @getx/database exec tsx scripts/fix-pokemon-go-boosting.ts

   Safe to re-run — it's idempotent (the new shape replaces whatever's
   there). Backs up the old value to console first for rollback. */

import { PrismaClient, type Prisma } from '@getx/database';

const prisma = new PrismaClient();

const NEW_FIELDS_CONFIG: Prisma.InputJsonValue = {
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
          slug: 'grunts-boost',
          name: 'Grunts Boost',
          icon: '⚡',
          description: 'Grunt-battle farming for stardust, candy, and event tokens',
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

async function main() {
  const existing = await prisma.game.findUnique({
    where: { slug: 'pokemon-go' },
    select: { id: true, slug: true, fieldsConfig: true },
  });
  if (!existing) {
    console.error('pokemon-go row not found — nothing to patch.');
    process.exit(1);
  }

  console.log('OLD fieldsConfig (backup):');
  console.log(JSON.stringify(existing.fieldsConfig, null, 2));

  const updated = await prisma.game.update({
    where: { slug: 'pokemon-go' },
    data: { fieldsConfig: NEW_FIELDS_CONFIG },
    select: { slug: true, fieldsConfig: true },
  });

  console.log('\nNEW fieldsConfig:');
  console.log(JSON.stringify(updated.fieldsConfig, null, 2));
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
