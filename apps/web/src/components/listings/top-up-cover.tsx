/* TopUpCover — branded cover art for PokéCoin top-up cards.
 *
 * Renders the gift-card template image (/topup-card-template.webp)
 * edge-to-edge. The parent ListingCard switches its image area to a
 * 3:4 aspect ratio for TOP_UPS so the natively-3:4 template fits
 * with no cropping — Pokémon GO logo at top, treasure chest at
 * bottom-left, and the blank bottom-right zone is overlaid with
 * the dynamic coin amount.
 *
 * Pure presentational — receives coin amount string from listing
 * attributes. No data, no events.
 */

import Image from 'next/image';

interface Props {
  coinAmount?: string | null;
}

function formatCoins(raw?: string | null): string | null {
  if (!raw) return null;
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return raw;
  return n.toLocaleString('en-US');
}

export function TopUpCover({ coinAmount }: Props) {
  const display = formatCoins(coinAmount);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Template — 1228×861 (~7:5 landscape). Parent card uses
          aspect-[7/5] so logo, chest, and right-side blank zone all
          render edge-to-edge with no crop. */}
      <Image
        src="/topup-card-template.webp"
        alt="Pokémon GO PokéCoins"
        fill
        sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
        className="object-cover object-center"
        priority={false}
      />

      {/* Coin amount overlay — sits in the right 40% of the landscape
          template, vertically centered. The template intentionally
          leaves this zone blank for dynamic text. Big bold white
          number, drop shadow for legibility against sky + grass. */}
      {display ? (
        <div className="absolute inset-y-0 right-0 w-[42%] flex flex-col items-center justify-center text-center text-white pointer-events-none px-3">
          <div
            className="font-display font-extrabold leading-none tabular-nums drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]"
            style={{ fontSize: 'clamp(1.8rem, 8vw, 3.2rem)' }}
          >
            {display}
          </div>
          <div className="font-display text-[12px] md:text-[14px] font-bold leading-tight mt-1 tracking-wide drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)]">
            PokéCoins
          </div>
        </div>
      ) : null}
    </div>
  );
}
