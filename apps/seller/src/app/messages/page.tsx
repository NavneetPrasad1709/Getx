'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Inbox,
  MessageSquare,
  Package,
  Search,
  Sparkles,
} from 'lucide-react';
import { Skeleton, motion } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { ChatWindow, Avatar } from '@/components/chat/chat-window';
import { useMyConversations, type Conversation } from '@/hooks/use-chat';
import { useAuth, type AuthUser } from '@/hooks/use-auth';

/* GETX Seller — Messages.
   ─────────────────────────────────────────────────────────────────────
   Two-pane layout (list + chat) on desktop, sliding view on mobile.
   Inspired by eldorado.gg's inbox and zeusx's contextual order banner,
   pushed further with:

     • Live unread counts in the header + filter pills
     • Search by buyer or order number
     • Filter pills: All, Unread, With order, Active
     • Animated active row highlight via layoutId
     • Mobile "back" button slides between list and chat
     • Empty states per-filter
*/

const EASE = [0.22, 1, 0.36, 1] as const;

type Filter = 'all' | 'unread' | 'order' | 'active';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'order', label: 'With order' },
  { key: 'active', label: 'Active' },
];

function unreadFor(c: Conversation, userId: string | undefined): number {
  if (!userId) return 0;
  return userId === c.buyerId ? c.buyerUnread : c.sellerUnread;
}

function counterpartyOf(c: Conversation, userId: string | undefined) {
  if (!userId) return c.buyer;
  return userId === c.buyerId ? c.seller : c.buyer;
}

function displayName(u: { username: string | null; name: string | null }): string {
  return u.username ?? u.name ?? '—';
}

function timeShort(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SellerMessagesPage() {
  const { user } = useAuth();
  const { data: conversations, isLoading } = useMyConversations(!!user);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const all = useMemo(() => conversations ?? [], [conversations]);

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { all: 0, unread: 0, order: 0, active: 0 };
    for (const c of all) {
      out.all += 1;
      if (unreadFor(c, user?.id) > 0) out.unread += 1;
      if (c.orderId) out.order += 1;
      if (c.status === 'ACTIVE') out.active += 1;
    }
    return out;
  }, [all, user?.id]);

  const filtered = useMemo(() => {
    const list = all.filter((c) => {
      if (filter === 'unread') return unreadFor(c, user?.id) > 0;
      if (filter === 'order') return !!c.orderId;
      if (filter === 'active') return c.status === 'ACTIVE';
      return true;
    });
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const cp = counterpartyOf(c, user?.id);
      const name = displayName(cp).toLowerCase();
      const orderNum = c.order?.orderNumber?.toLowerCase() ?? '';
      const offerNum = c.offer?.request?.requestNumber?.toLowerCase() ?? '';
      const lastMsg = (c.lastMessageText ?? '').toLowerCase();
      return (
        name.includes(q) || orderNum.includes(q) || offerNum.includes(q) || lastMsg.includes(q)
      );
    });
  }, [all, filter, query, user?.id]);

  const totalUnread = counts.unread;
  const selectedConv = useMemo(
    () => all.find((c) => c.id === selectedId) ?? null,
    [all, selectedId],
  );

  return (
    <SellerShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-6xl mx-auto space-y-5 lg:space-y-6"
      >
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
                Buyer chat
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
                Messages
              </h1>
              <p className="text-[13.5px] text-muted-foreground mt-1">
                Reply within 30 minutes — sellers who do convert 3× more.
              </p>
            </div>
            {totalUnread > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 bg-primary/10 ring-1 ring-primary/25 text-primary"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inset-0 rounded-full bg-primary opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] font-bold">
                  {totalUnread} unread
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── TWO-PANE BODY ──────────────────────────────────────────── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-0 rounded-3xl bg-surface ring-1 ring-border overflow-hidden h-[78vh] min-h-[560px]"
        >
          {/* LIST PANE */}
          <aside
            className={`
              border-b md:border-b-0 md:border-r border-border flex-col bg-surface min-h-0
              ${selectedId ? 'hidden md:flex' : 'flex'}
            `}
          >
            {/* Search */}
            <div className="p-3 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search buyers, orders"
                  className="w-full h-10 pl-9 pr-3 rounded-full bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 text-[13px] outline-none transition-all"
                />
              </div>
            </div>

            {/* Filter pills */}
            <div className="px-3 py-2 border-b border-border shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-0.5">
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  const count = counts[f.key];
                  return (
                    <motion.button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        relative inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors
                        ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                      `}
                    >
                      {active && (
                        <motion.span
                          layoutId="msg-filter-pill"
                          className="absolute inset-0 -z-10 rounded-full bg-muted/40 ring-1 ring-border"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      {f.label}
                      <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9.5px] font-mono font-bold tabular-nums bg-muted/40 text-foreground/80">
                        {count}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoading || !user ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <ListEmpty filter={filter} hasAny={all.length > 0} query={query} />
              ) : (
                filtered.map((c, idx) => (
                  <ConvRow
                    key={c.id}
                    conv={c}
                    user={user}
                    active={selectedId === c.id}
                    onSelect={() => setSelectedId(c.id)}
                    idx={idx}
                  />
                ))
              )}
            </div>
          </aside>

          {/* CHAT PANE */}
          <section
            className={`
              flex-col bg-background min-h-0
              ${selectedId ? 'flex' : 'hidden md:flex'}
            `}
          >
            {/* Mobile back button */}
            {selectedId && (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="md:hidden inline-flex items-center gap-1.5 h-9 px-3 m-2 rounded-full bg-muted/30 hover:bg-muted/50 text-[12.5px] font-semibold w-fit transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to inbox
              </button>
            )}
            {selectedConv ? (
              <ChatWindow conversationId={selectedConv.id} className="flex-1" />
            ) : (
              <ChatPlaceholder hasConvs={all.length > 0} />
            )}
          </section>
        </motion.div>
      </motion.div>
    </SellerShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  CONVERSATION ROW                                                    */
/* ══════════════════════════════════════════════════════════════════ */
function ConvRow({
  conv,
  user,
  active,
  onSelect,
  idx,
}: {
  conv: Conversation;
  user: AuthUser;
  active: boolean;
  onSelect: () => void;
  idx: number;
}) {
  const cp = counterpartyOf(conv, user.id);
  const unread = unreadFor(conv, user.id);
  const lastMsg = conv.lastMessageText ?? '—';
  const time = timeShort(conv.lastMessageAt);
  const orderTag = conv.order
    ? { label: `Order ${conv.order.orderNumber}`, tone: 'bg-primary/10 text-primary' }
    : conv.offer
      ? { label: `Req ${conv.offer.request.requestNumber}`, tone: 'bg-accent/10 text-accent' }
      : null;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx, 8) * 0.03, duration: 0.3, ease: EASE }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full text-left p-2.5 sm:p-3 rounded-2xl transition-colors
        ${active ? 'text-foreground' : 'hover:bg-muted/20'}
      `}
    >
      {active && (
        <motion.span
          layoutId="conv-active"
          className="absolute inset-0 -z-10 rounded-2xl bg-primary/10 ring-1 ring-primary/25"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <div className="flex items-start gap-3">
        <Avatar user={cp} size="md" online={conv.status === 'ACTIVE'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[13.5px] text-foreground truncate">
              {displayName(cp)}
            </span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums shrink-0">
              {time}
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground truncate mt-0.5">
            {lastMsg}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {orderTag && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold ${orderTag.tone}`}
              >
                <Package className="h-2.5 w-2.5" strokeWidth={2.5} />
                {orderTag.label}
              </span>
            )}
            {unread > 0 && (
              <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground font-mono text-[10px] font-bold tabular-nums">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  EMPTY STATES                                                        */
/* ══════════════════════════════════════════════════════════════════ */
function ListEmpty({
  filter,
  hasAny,
  query,
}: {
  filter: Filter;
  hasAny: boolean;
  query: string;
}) {
  if (query.trim()) {
    return (
      <div className="px-4 py-10 text-center">
        <div className="grid place-items-center h-10 w-10 rounded-full bg-muted/30 text-muted-foreground mx-auto mb-2">
          <Search className="h-4 w-4" />
        </div>
        <div className="text-[12.5px] text-muted-foreground">
          No matches for &ldquo;{query}&rdquo;.
        </div>
      </div>
    );
  }
  if (!hasAny) {
    return (
      <div className="px-4 py-10 text-center">
        <div className="grid place-items-center h-12 w-12 rounded-2xl bg-primary/10 text-primary mx-auto mb-3">
          <Inbox className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="font-display font-bold text-[14px] mb-1">No conversations yet</div>
        <div className="text-[12px] text-muted-foreground max-w-xs mx-auto">
          When buyers reach out about your listings or offers, the chat starts here.
        </div>
      </div>
    );
  }
  const labels: Record<Filter, string> = {
    all: 'conversations',
    unread: 'unread chats',
    order: 'order chats',
    active: 'active chats',
  };
  return (
    <div className="px-4 py-10 text-center">
      <div className="text-[12px] text-muted-foreground">No {labels[filter]} right now.</div>
    </div>
  );
}

function ChatPlaceholder({ hasConvs }: { hasConvs: boolean }) {
  return (
    <div className="flex-1 grid place-items-center p-8 text-center">
      <div>
        <motion.div
          aria-hidden
          animate={{ rotate: [0, -4, 4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20"
        >
          <MessageSquare className="h-7 w-7" strokeWidth={2.25} />
        </motion.div>
        <h2 className="font-display text-xl font-bold mb-1.5">
          {hasConvs ? 'Pick a conversation' : 'Quiet for now'}
        </h2>
        <p className="text-[13px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {hasConvs ? (
            <>Tap any chat on the left to open it. Reply fast — buyers convert 3× more when sellers respond inside 30 min.</>
          ) : (
            <>You don&apos;t have any active chats yet. Buyers will message you when they have questions about your listings.</>
          )}
        </p>
        {!hasConvs && (
          <Link
            href="/listings/new"
            className="
              inline-flex items-center gap-1.5 mt-5 h-11 px-5 rounded-full
              bg-gradient-to-b from-primary to-primary-hover
              text-primary-foreground text-[13px] font-bold
              shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]
              hover:-translate-y-px transition-all
            "
          >
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            Create your first listing
          </Link>
        )}
      </div>
    </div>
  );
}
