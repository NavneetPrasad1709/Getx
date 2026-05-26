/* One-shot prod patch: rename the "XP Boost" service to "Grunts Boost"
   inside pokemon-go's fieldsConfig.tabs[].subServices[].

   Run with:  pnpm --filter @getx/database exec tsx scripts/rename-xp-to-grunts.ts

   Safe to re-run — idempotent (looks for the xp-boost slug and replaces
   in place). Backs up the old shape to console for rollback. */

import { PrismaClient } from '@getx/database';

const prisma = new PrismaClient();

interface SubService {
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  estimatedTime?: string;
  [k: string]: unknown;
}

interface Tab {
  slug: string;
  name: string;
  type: string;
  icon?: string;
  subServices?: SubService[];
  [k: string]: unknown;
}

interface FieldsConfig {
  tabs?: Tab[];
  [k: string]: unknown;
}

async function main() {
  const existing = await prisma.game.findUnique({
    where: { slug: 'pokemon-go' },
    select: { id: true, slug: true, fieldsConfig: true },
  });
  if (!existing) {
    console.error('pokemon-go row not found.');
    process.exit(1);
  }

  const fc = existing.fieldsConfig as FieldsConfig | null;
  if (!fc?.tabs) {
    console.error('No tabs in fieldsConfig.');
    process.exit(1);
  }

  console.log('Before:');
  for (const tab of fc.tabs) {
    if (tab.type === 'REVERSE') {
      for (const s of tab.subServices ?? []) {
        console.log(`  - ${s.slug}: ${s.name}`);
      }
    }
  }

  let patched = 0;
  for (const tab of fc.tabs) {
    if (tab.type !== 'REVERSE' || !tab.subServices) continue;
    for (const s of tab.subServices) {
      if (s.slug === 'xp-boost') {
        s.slug = 'grunts-boost';
        s.name = 'Grunts Boost';
        s.description = 'Grunt-battle farming for stardust, candy, and event tokens';
        patched++;
      }
    }
  }

  if (patched === 0) {
    console.log('No xp-boost service found to rename.');
    return;
  }

  await prisma.game.update({
    where: { slug: 'pokemon-go' },
    data: { fieldsConfig: fc as object },
  });

  console.log('\nAfter:');
  for (const tab of fc.tabs) {
    if (tab.type === 'REVERSE') {
      for (const s of tab.subServices ?? []) {
        console.log(`  - ${s.slug}: ${s.name}`);
      }
    }
  }
  console.log(`\nPatched ${patched} service(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
