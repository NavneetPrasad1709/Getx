import { Star, Sparkles, Crown, Trophy, Shield, Zap } from 'lucide-react';

export type Rank = 'ROOKIE' | 'RISING' | 'TRUSTED' | 'PRO' | 'ELITE' | 'LEGEND';

/* RankBadge — public rank ribbon shown next to seller/buyer handles on
   listings, profiles, order pages, and the top-sellers rail.

   Visual hierarchy mirrors the perks ladder: gray → cobalt → green →
   purple → gold → animated rainbow. LEGEND uses a CSS gradient text
   shift via Tailwind's `bg-clip-text` so it gently rotates without
   needing keyframes the user has to opt into. */

interface RankConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  surface: string;
  text: string;
  ring: string;
}

const RANK_CONFIG: Record<Rank, RankConfig> = {
  ROOKIE: {
    label: 'Rookie',
    icon: Shield,
    surface: 'bg-[hsl(var(--muted-foreground)/0.12)]',
    text: 'text-[hsl(var(--muted-foreground))]',
    ring: 'ring-[hsl(var(--muted-foreground)/0.25)]',
  },
  RISING: {
    label: 'Rising',
    icon: Zap,
    surface: 'bg-[hsl(var(--primary)/0.12)]',
    text: 'text-[hsl(var(--primary))]',
    ring: 'ring-[hsl(var(--primary)/0.3)]',
  },
  TRUSTED: {
    label: 'Trusted',
    icon: Shield,
    surface: 'bg-[hsl(var(--success)/0.14)]',
    text: 'text-[hsl(var(--success))]',
    ring: 'ring-[hsl(var(--success)/0.32)]',
  },
  PRO: {
    label: 'Pro',
    icon: Star,
    surface: 'bg-[hsl(280_85%_60%/0.14)]',
    text: 'text-[hsl(280_85%_60%)]',
    ring: 'ring-[hsl(280_85%_60%/0.32)]',
  },
  ELITE: {
    label: 'Elite',
    icon: Trophy,
    surface: 'bg-[hsl(45_95%_55%/0.16)]',
    text: 'text-[hsl(45_95%_55%)]',
    ring: 'ring-[hsl(45_95%_55%/0.4)]',
  },
  LEGEND: {
    label: 'Legend',
    icon: Crown,
    /* Subtle gradient surface — keeps it premium without a full animation
       which can be distracting at smaller sizes. */
    surface:
      'bg-gradient-to-r from-[hsl(280_85%_60%/0.18)] via-[hsl(45_95%_55%/0.2)] to-[hsl(0_85%_60%/0.18)]',
    text: 'bg-gradient-to-r from-[hsl(280_85%_60%)] via-[hsl(45_95%_55%)] to-[hsl(0_85%_60%)] bg-clip-text text-transparent',
    ring: 'ring-[hsl(45_95%_55%/0.45)]',
  },
};

const SIZE = {
  xs: 'h-5 px-1.5 text-[9.5px] gap-0.5',
  sm: 'h-6 px-2 text-[10.5px] gap-1',
  md: 'h-7 px-2.5 text-[11.5px] gap-1.5',
} as const;

const ICON_SIZE = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
} as const;

export function RankBadge({
  rank,
  size = 'sm',
  showIcon = true,
  className,
}: {
  rank: Rank | null | undefined;
  size?: keyof typeof SIZE;
  showIcon?: boolean;
  className?: string;
}) {
  /* Suppress Rookie by default — every signup starts at Rookie so
     rendering it everywhere creates noise. Pages that explicitly want
     it (the rank ladder page itself) can pass `rank` directly to the
     RankBadgeRaw component below. */
  if (!rank || rank === 'ROOKIE') return null;
  return <RankBadgeRaw rank={rank} size={size} showIcon={showIcon} className={className} />;
}

export function RankBadgeRaw({
  rank,
  size = 'sm',
  showIcon = true,
  className,
}: {
  rank: Rank;
  size?: keyof typeof SIZE;
  showIcon?: boolean;
  className?: string;
}) {
  const cfg = RANK_CONFIG[rank];
  const Icon = cfg.icon;
  const isLegend = rank === 'LEGEND';
  return (
    <span
      aria-label={`Rank: ${cfg.label}`}
      className={[
        'inline-flex items-center font-bold uppercase tracking-[0.08em] rounded-full ring-1 ring-inset',
        isLegend ? 'bg-clip-padding' : '',
        cfg.surface,
        cfg.ring,
        SIZE[size],
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showIcon ? (
        <Icon
          className={[
            ICON_SIZE[size],
            /* Icon stays solid on LEGEND — gradient text only applies to
               the label. */
            isLegend ? 'text-[hsl(45_95%_55%)]' : cfg.text,
            isLegend ? '' : 'fill-current',
          ].join(' ')}
        />
      ) : null}
      <span className={cfg.text}>{cfg.label}</span>
    </span>
  );
}

/* ---------- shim ---------- */
/* Drop-in for old VerifiedTier badge call-sites. Maps the legacy enum
   to the new ranks so we can swap usages incrementally. Returns null
   for unknown tiers so removing a stale value never crashes the UI. */
const TIER_TO_RANK: Record<string, Rank> = {
  BASIC: 'ROOKIE',
  VERIFIED: 'RISING',
  PREMIUM: 'PRO',
  ELITE: 'ELITE',
};

export function TierAsRankBadge({
  tier,
  rank,
  size = 'sm',
}: {
  tier?: string | null;
  rank?: Rank | null;
  size?: keyof typeof SIZE;
}) {
  /* Prefer the new rank field. Fall back to the legacy verifiedTier
     only while a row hasn't been backfilled. */
  const resolved = rank ?? (tier ? TIER_TO_RANK[tier] ?? null : null);
  return <RankBadge rank={resolved} size={size} />;
}
