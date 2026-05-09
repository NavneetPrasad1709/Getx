'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@getx/ui';
import type { ListingFilters } from '@/hooks/use-listings';
import { CustomRequestCTA } from '@/components/custom-request/custom-request-cta';

const COIN_AMOUNTS = ['100', '500', '1200', '2500', '5200', '14500'];
const DELIVERY_METHODS = ['Account login', 'Gift code'];
const PLATFORMS = ['iOS', 'Android'];

interface Props {
  filters: ListingFilters;
  onUpdate: (updates: Partial<ListingFilters>) => void;
  onClear: () => void;
}

export function TopUpsFilters({ filters, onUpdate, onClear }: Props) {
  const hasActiveFilters = !!(
    filters.priceMin ||
    filters.priceMax ||
    filters.coinAmount ||
    filters.deliveryMethod ||
    filters.platform
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Filters</CardTitle>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <FilterGroup label="PokéCoin amount">
          <select
            value={filters.coinAmount ?? ''}
            onChange={(e) => onUpdate({ coinAmount: e.target.value || undefined })}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Any amount</option>
            {COIN_AMOUNTS.map((a) => (
              <option key={a} value={a}>
                {a} coins
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup label="Delivery method">
          <div className="space-y-2">
            {DELIVERY_METHODS.map((method) => (
              <label key={method} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={filters.deliveryMethod === method}
                  onChange={() => onUpdate({ deliveryMethod: method })}
                  className="rounded"
                />
                {method}
              </label>
            ))}
            {filters.deliveryMethod && (
              <button
                type="button"
                onClick={() => onUpdate({ deliveryMethod: undefined })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear method
              </button>
            )}
          </div>
        </FilterGroup>

        <FilterGroup label="Price (USD)">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.priceMin ?? ''}
              onChange={(e) =>
                onUpdate({
                  priceMin: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="text-sm"
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.priceMax ?? ''}
              onChange={(e) =>
                onUpdate({
                  priceMax: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="text-sm"
            />
          </div>
        </FilterGroup>

        <FilterGroup label="Platform">
          <select
            value={filters.platform ?? ''}
            onChange={(e) => onUpdate({ platform: e.target.value || undefined })}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Any platform</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FilterGroup>

        <div className="pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground mb-2">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <CustomRequestCTA gameSlug="pokemon-go" tabType="TOP_UPS" variant="inline" />
        </div>
      </CardContent>
    </Card>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
