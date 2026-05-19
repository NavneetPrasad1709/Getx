'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Bell } from 'lucide-react';
import { toast } from '@getx/ui';

/* ComingSoonStrip — slim roadmap teaser.

   Replaces the dense 12-tile catalog. Only Pokémon GO is live on GetX
   today; this strip frames everything else honestly as "coming" with a
   target window and a "Notify me" prompt so we capture interest without
   making the marketplace look hollow.

   Layout: section header + 4 small game cards in a row. Each card is
   non-clickable; the "Notify me" button stores intent in localStorage and
   pops a confirmation toast. When the backend ships a waitlist endpoint,
   swap the localStorage write for a POST. */

const NOTIFY_STORAGE_KEY = 'getx:notify:games';

interface UpcomingGame {
  slug: string;
  name: string;
  window: string;
}

const UPCOMING: UpcomingGame[] = [
  { slug: 'roblox', name: 'Roblox', window: 'In testing' },
  { slug: 'valorant', name: 'Valorant', window: 'Q3 2026' },
  { slug: 'bgmi', name: 'BGMI', window: 'Q4 2026' },
  { slug: 'genshin', name: 'Genshin Impact', window: 'Soon' },
];

function readNotifyList(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(NOTIFY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function writeNotifyList(list: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function ComingSoonStrip() {
  const reduce = useReducedMotion();
  const [subscribed, setSubscribed] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setSubscribed(new Set(readNotifyList()));
  }, []);

  const onNotify = (game: UpcomingGame) => {
    const next = new Set(subscribed);
    if (next.has(game.slug)) {
      next.delete(game.slug);
      toast.info(`Notifications off for ${game.name}`);
    } else {
      next.add(game.slug);
      toast.success(`We'll ping you when ${game.name} goes live.`);
    }
    writeNotifyList(Array.from(next));
    setSubscribed(next);
  };

  return (
    <section
      aria-label="Coming soon to GetX"
      className="relative bg-[hsl(0_0%_3%)] border-t border-border/60 py-14 md:py-16"
    >
      <div className="container">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-2">
              Roadmap · 2026
            </div>
            <h2 className="font-display font-bold uppercase leading-[0.9] tracking-[-0.01em] text-[clamp(1.75rem,4vw,3rem)] text-white">
              More games. Coming soon.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-white/55">
            Pokémon GO is live today. We&apos;re building four more — get a ping the day each
            one opens.
          </p>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {UPCOMING.map((g, i) => {
            const isOn = subscribed.has(g.slug);
            return (
              <motion.li
                key={g.slug}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.4,
                  delay: 0.04 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex items-center gap-3 bg-black border border-border/60 p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[hsl(0_0%_8%)] border border-border/60 text-white/55">
                  <Lock className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base font-bold uppercase tracking-tight text-white truncate">
                    {g.name}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                    {g.window}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNotify(g)}
                  aria-pressed={isOn}
                  className={`group inline-flex items-center gap-1 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors duration-ui ${
                    isOn
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border/60 text-white/75 hover:border-primary hover:text-primary'
                  }`}
                >
                  <Bell className={`h-3 w-3 ${isOn ? '' : 'group-hover:text-primary'}`} />
                  {isOn ? 'On' : 'Notify'}
                </button>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
