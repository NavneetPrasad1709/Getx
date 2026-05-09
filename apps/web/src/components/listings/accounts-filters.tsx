'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@getx/ui';
import type { ListingFilters } from '@/hooks/use-listings';
import { CustomRequestCTA } from '@/components/custom-request/custom-request-cta';

const TEAMS = ['Mystic', 'Valor', 'Instinct'];
const REGIONS = ['Global', 'India', 'USA', 'EU', 'Asia'];
const PLATFORMS = ['iOS', 'Android'];

interface Props {
  filters: ListingFilters;
  onUpdate: (updates: Partial<ListingFilters>) => void;
  onClear: () => void;
}

export function AccountsFilters({ filters, onUpdate, onClear }: Props) {
  const selectedTeams = filters.team ? filters.team.split(',') : [];

  const toggleTeam = (team: string) => {
    const next = selectedTeams.includes(team)
      ? selectedTeams.filter((t) => t !== team)
      : [...selectedTeams, team];
    onUpdate({ team: next.length > 0 ? next.join(',') : undefined });
  };

  const hasActiveFilters = !!(
    filters.priceMin ||
    filters.priceMax ||
    filters.levelMin ||
    filters.levelMax ||
    filters.team ||
    filters.shinyMin ||
    filters.legendaryMin ||
    filters.hundoMin ||
    filters.region ||
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

        <FilterGroup label="Level">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min (1)"
              min={1}
              max={80}
              value={filters.levelMin ?? ''}
              onChange={(e) =>
                onUpdate({
                  levelMin: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="text-sm"
            />
            <Input
              type="number"
              placeholder="Max (80)"
              min={1}
              max={80}
              value={filters.levelMax ?? ''}
              onChange={(e) =>
                onUpdate({
                  levelMax: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="text-sm"
            />
          </div>
        </FilterGroup>

        <FilterGroup label="Team">
          <div className="space-y-2">
            {TEAMS.map((team) => (
              <label key={team} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(team)}
                  onChange={() => toggleTeam(team)}
                  className="rounded"
                />
                {team}
              </label>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Shiny count (minimum)">
          <Input
            type="number"
            placeholder="e.g., 50"
            min={0}
            value={filters.shinyMin ?? ''}
            onChange={(e) =>
              onUpdate({
                shinyMin: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
            className="text-sm"
          />
        </FilterGroup>

        <FilterGroup label="Legendary count (minimum)">
          <Input
            type="number"
            placeholder="e.g., 10"
            min={0}
            value={filters.legendaryMin ?? ''}
            onChange={(e) =>
              onUpdate({
                legendaryMin: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
            className="text-sm"
          />
        </FilterGroup>

        <FilterGroup label="100% IV Pokemon (minimum)">
          <Input
            type="number"
            placeholder="e.g., 5"
            min={0}
            value={filters.hundoMin ?? ''}
            onChange={(e) =>
              onUpdate({
                hundoMin: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
            className="text-sm"
          />
        </FilterGroup>

        <FilterGroup label="Region">
          <select
            value={filters.region ?? ''}
            onChange={(e) => onUpdate({ region: e.target.value || undefined })}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Any region</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
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
          <CustomRequestCTA gameSlug="pokemon-go" tabType="ACCOUNTS" variant="inline" />
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
