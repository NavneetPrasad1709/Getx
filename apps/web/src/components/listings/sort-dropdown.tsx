'use client';

import type { SortOption } from '@/hooks/use-listings';

interface Props {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

const OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating-desc', label: 'Highest rated sellers' },
  { value: 'popular', label: 'Most popular' },
];

export function SortDropdown({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="text-muted-foreground hidden sm:inline">Sort by:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[160px]"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
