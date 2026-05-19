import { RefreshCcw } from 'lucide-react';

/* RefundSlaChip — surfaces refund SLA next to GETX Shield on every listing
   surface. Copy varies by category + seller tier:

     ELITE seller         → "1-hr SLA"
     Boosting category    → "48-hr SLA"   (fulfillment window is longer)
     everything else      → "2-hr refund SLA"

   Sizes match GetxShieldBadge for tabular alignment in any row. */

type SlaVariant = 'compact' | 'inline';

interface Props {
  variant?: SlaVariant;
  category?: string;
  sellerTier?: string;
  className?: string;
}

function deriveSla(category?: string, sellerTier?: string): string {
  if (sellerTier && sellerTier.toUpperCase() === 'ELITE') return '1-hr SLA';
  const c = (category ?? '').toLowerCase().replace('_', '-');
  if (c === 'boosting' || c === 'boost') return '48-hr SLA';
  return '2-hr refund SLA';
}

export function RefundSlaChip({
  variant = 'compact',
  category,
  sellerTier,
  className,
}: Props) {
  const label = deriveSla(category, sellerTier);

  const sizeCls =
    variant === 'compact'
      ? 'h-[18px] px-2 gap-1 text-[11px]'
      : 'h-[28px] px-3 gap-1.5 text-[13px]';
  const iconCls = variant === 'compact' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span
      role="img"
      aria-label={`Refund SLA · ${label}`}
      className={`inline-flex items-center rounded-full bg-[hsl(var(--success)/0.12)] border border-[hsl(var(--success)/0.25)] text-[hsl(var(--success))] font-semibold leading-none whitespace-nowrap select-none ${sizeCls} ${className ?? ''}`}
    >
      <RefreshCcw className={iconCls} aria-hidden />
      {label}
    </span>
  );
}
