'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@getx/ui';
import { Search, Gamepad2, ShieldCheck, Sparkles, Users, FileText, ArrowRight } from 'lucide-react';

type Action = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'Marketplace' | 'Account' | 'Info';
};

const ACTIONS: Action[] = [
  { id: 'games', label: 'Browse all games', href: '/games', icon: Gamepad2, group: 'Marketplace' },
  { id: 'pogo', label: 'Pokémon GO listings', hint: 'Live now', href: '/games/pokemon-go', icon: Sparkles, group: 'Marketplace' },
  { id: 'pogo-acc', label: 'Pokémon GO — accounts', href: '/games/pokemon-go/accounts', icon: Gamepad2, group: 'Marketplace' },
  { id: 'pogo-top', label: 'Pokémon GO — top-ups', href: '/games/pokemon-go/top-ups', icon: Gamepad2, group: 'Marketplace' },
  { id: 'pogo-items', label: 'Pokémon GO — items', href: '/games/pokemon-go/items', icon: Gamepad2, group: 'Marketplace' },
  { id: 'pogo-boost', label: 'Pokémon GO — boosting', href: '/games/pokemon-go/boosting', icon: Gamepad2, group: 'Marketplace' },
  { id: 'requests', label: 'Post a custom request', href: '/requests/new', icon: FileText, group: 'Marketplace' },
  { id: 'orders', label: 'My orders', href: '/profile/orders', icon: ArrowRight, group: 'Account' },
  { id: 'requests-mine', label: 'My requests', href: '/profile/requests', icon: ArrowRight, group: 'Account' },
  { id: 'messages', label: 'Messages', href: '/messages', icon: ArrowRight, group: 'Account' },
  { id: 'profile', label: 'Profile', href: '/profile', icon: Users, group: 'Account' },
  { id: 'trust', label: 'Trust & safety', href: '/trust', icon: ShieldCheck, group: 'Info' },
  { id: 'how', label: 'How it works', href: '/how-it-works', icon: FileText, group: 'Info' },
  { id: 'about', label: 'About GETX', href: '/about', icon: FileText, group: 'Info' },
  { id: 'careers', label: 'Careers', href: '/careers', icon: Users, group: 'Info' },
];

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { open, setOpen };
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ACTIONS;
    return ACTIONS.filter((a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q));
  }, [query]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Action[]>();
    for (const a of filtered) {
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function run(a: Action) {
    onOpenChange(false);
    router.push(a.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const a = filtered[active];
      if (a) run(a);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden border-border/60 bg-surface/95 backdrop-blur-2xl">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search games, listings, pages…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-sm"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-border/60 bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="px-2 py-1">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  {group}
                </div>
                {items.map((a) => {
                  const idx = filtered.indexOf(a);
                  const isActive = idx === active;
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => run(a)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors ${
                        isActive ? 'bg-primary/10 text-foreground' : 'text-foreground/80 hover:bg-surface-elevated'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="flex-1 truncate">{a.label}</span>
                      {a.hint && (
                        <span className="text-[10px] uppercase tracking-wider font-mono text-primary">
                          {a.hint}
                        </span>
                      )}
                      {isActive && <ArrowRight className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 text-[11px] font-mono text-muted-foreground bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
          </div>
          <span>GETX command palette</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
