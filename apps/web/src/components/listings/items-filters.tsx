'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@getx/ui';
import type { ListingFilters } from '@/hooks/use-listings';

const ITEM_TYPES = [
  'Pokeballs',
  'Great Balls',
  'Ultra Balls',
  'Razz Berries',
  'Pinap Berries',
  'Nanab Berries',
  'Potions',
  'Super Potions',
  'Hyper Potions',
  'Revives',
  'Max Revives',
];

interface Props {
  filters: ListingFilters;
  onUpdate: (updates: Partial<ListingFilters>) => void;
  onClear: () => void;
}

export function ItemsFilters({ filters, onUpdate, onClear }: Props) {
  const selectedTypes = filters.itemTypes ? filters.itemTypes.split(',') : [];

  const toggleType = (type: string) => {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    onUpdate({ itemTypes: next.length > 0 ? next.join(',') : undefined });
  };

  const hasActiveFilters = !!(
    filters.priceMin ||
    filters.priceMax ||
    filters.itemTypes ||
    filters.quantityMin
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
        <FilterGroup label="Item types">
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {ITEM_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => toggleType(type)}
                  className="rounded"
                />
                {type}
              </label>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Total quantity (minimum)">
          <Input
            type="number"
            placeholder="e.g., 100"
            min={0}
            value={filters.quantityMin ?? ''}
            onChange={(e) =>
              onUpdate({
                quantityMin: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
            className="text-sm"
          />
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
