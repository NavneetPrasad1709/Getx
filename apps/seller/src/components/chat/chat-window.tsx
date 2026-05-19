'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ImagePlus,
  Lock,
  MessageSquare,
  Package,
  Send,
  Sparkles,
} from 'lucide-react';
import { Skeleton, motion, AnimatePresence } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';
import {
  useConversation,
  useMarkRead,
  useMessages,
  useRealtimeChat,
  useSendMessage,
  type ChatMessage,
  type ChatUser,
  type Conversation,
} from '@/hooks/use-chat';

interface Props {
  conversationId: string;
  className?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const QUICK_REPLIES = [
  '👋 Hey! Got it, on it now.',
  '✅ Delivered — please confirm.',
  'Need your in-game name to start, please.',
  'Sorry for the wait — almost done.',
  'Thanks for buying! Anything else?',
];

function displayName(u: ChatUser | null | undefined): string {
  return u?.username ?? u?.name ?? '—';
}

function initials(u: ChatUser | null | undefined): string {
  const src = u?.name ?? u?.username ?? '?';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* GETX Seller — Chat Window.
   ─────────────────────────────────────────────────────────────────────
   Drop-in replacement for the previous bare chat. Adds:

     • Counterparty header with avatar, online dot, order/offer chip
     • Sticky order context banner that links to the order detail page
     • Day separators between message groups
     • Bubble-grouping (consecutive same-sender bubbles snug together)
     • Animated typing indicator with three pulsing dots
     • Read receipts (Check vs CheckCheck) in primary
     • Quick-reply chips above the input — seller-tuned canned phrases
     • Auto-growing textarea with Shift+Enter newline / Enter to send
     • Smooth scroll-to-bottom on new messages

   Visible everywhere the chat is rendered: full /messages pane AND the
   ChatButton floating popup. Sizes itself off the parent so both work. */
export function ChatWindow({ conversationId, className = '' }: Props) {
  const { user } = useAuth();
  const { data: conv } = useConversation(conversationId);
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const markRead = useMarkRead();
  const { typingUsers, sendTyping } = useRealtimeChat(conversationId);

  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers.size]);

  useEffect(() => {
    if (conversationId) markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  /* Auto-grow textarea — capped at 6 rows. */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
  }, [input]);

  if (!user) return null;

  const counterparty = conv ? (user.id === conv.buyerId ? conv.seller : conv.buyer) : null;

  const handleInputChange = (value: string) => {
    setInput(value);
    sendTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 1500);
  };

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage.mutate({ content: trimmed });
    setInput('');
    sendTyping(false);
    setShowQuick(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full min-h-[400px] bg-background ${className}`}>
      <ChatHeader conv={conv} counterparty={counterparty} />
      <OrderContextBanner conv={conv} />

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-1">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="h-12 w-3/4 ml-auto rounded-2xl" />
            <Skeleton className="h-12 w-1/2 rounded-2xl" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <ChatEmptyState />
        ) : (
          <MessageList messages={messages} ownId={user.id} counterparty={counterparty} />
        )}

        <TypingIndicator visible={typingUsers.size > 0} counterparty={counterparty} />

        <div ref={messagesEndRef} />
      </div>

      {showQuick && messages && messages.length > 0 && (
        <QuickReplies
          onPick={(text) => {
            setInput((cur) => (cur ? `${cur} ${text}` : text));
            inputRef.current?.focus();
          }}
          onDismiss={() => setShowQuick(false)}
        />
      )}

      <form
        onSubmit={handleSend}
        className="border-t border-border bg-surface/80 backdrop-blur-sm px-3 sm:px-4 py-3"
      >
        <div className="flex items-end gap-2">
          <button
            type="button"
            disabled
            title="Attachments coming soon"
            aria-label="Attach image"
            className="grid place-items-center h-10 w-10 rounded-full bg-muted/30 text-muted-foreground shrink-0 hover:bg-muted/50 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImagePlus className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…   (Shift+Enter for newline)"
              maxLength={2000}
              rows={1}
              className="w-full max-h-36 resize-none rounded-2xl bg-muted/25 ring-1 ring-transparent focus:bg-surface focus:ring-primary/35 px-4 py-2.5 text-[14px] outline-none transition-all leading-relaxed"
            />
            {input.length > 1500 && (
              <span className="absolute right-3 bottom-1 font-mono text-[10px] text-muted-foreground tabular-nums">
                {input.length} / 2000
              </span>
            )}
          </div>
          <motion.button
            type="submit"
            disabled={!input.trim() || sendMessage.isPending}
            whileTap={input.trim() ? { scale: 0.92 } : undefined}
            whileHover={input.trim() ? { y: -1 } : undefined}
            className={`
              grid place-items-center h-10 w-10 rounded-full shrink-0 transition-all
              ${
                input.trim() && !sendMessage.isPending
                  ? 'bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-[0_6px_18px_-4px_hsl(var(--primary)/0.55)]'
                  : 'bg-muted/40 text-muted-foreground cursor-not-allowed'
              }
            `}
            aria-label="Send"
          >
            <Send className="h-4 w-4" strokeWidth={2.5} />
          </motion.button>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[10.5px] text-muted-foreground">
          <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
          Chats are encrypted in transit. Never share login credentials outside an order.
        </div>
      </form>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  HEADER                                                              */
/* ══════════════════════════════════════════════════════════════════ */
function ChatHeader({
  conv,
  counterparty,
}: {
  conv: Conversation | undefined;
  counterparty: ChatUser | null;
}) {
  return (
    <div className="border-b border-border bg-surface/85 backdrop-blur-sm px-4 py-3 flex items-center gap-3 shrink-0">
      <Avatar user={counterparty} size="md" online />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px] leading-tight truncate">
          {displayName(counterparty)}
        </div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
          {conv?.status === 'ACTIVE' ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Active
            </span>
          ) : conv?.status === 'CLOSED' ? (
            'Closed'
          ) : (
            ''
          )}
        </div>
      </div>
    </div>
  );
}

/* Order/offer context banner — keeps the seller anchored to what
   they're talking about and gives a one-click jump to the order page. */
function OrderContextBanner({ conv }: { conv: Conversation | undefined }) {
  if (!conv) return null;
  if (!conv.order && !conv.offer) return null;
  const isOrder = !!conv.order;
  const ctx = isOrder
    ? { label: 'Order', number: conv.order!.orderNumber, href: `/orders/${conv.order!.id}` }
    : {
        label: 'Request',
        number: conv.offer!.request.requestNumber,
        href: `/requests/${conv.offer!.request.id}`,
      };
  return (
    <Link
      href={ctx.href}
      className="group flex items-center gap-3 px-4 py-2.5 bg-primary/8 ring-1 ring-primary/15 mx-3 sm:mx-4 mt-3 rounded-2xl hover:bg-primary/12 transition-colors"
    >
      <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/15 text-primary shrink-0">
        <Package className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary font-bold">
          {ctx.label} context
        </div>
        <div className="font-semibold text-[13px] truncate">
          {isOrder ? `Order ${ctx.number}` : conv.offer!.request.title}
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  MESSAGE LIST — day separators + bubble grouping                     */
/* ══════════════════════════════════════════════════════════════════ */
interface Group {
  day: string;
  runs: { senderId: string; msgs: ChatMessage[]; isSystem: boolean }[];
}

function MessageList({
  messages,
  ownId,
  counterparty,
}: {
  messages: ChatMessage[];
  ownId: string;
  counterparty: ChatUser | null;
}) {
  /* Group by day → then by consecutive sender so we can snug bubbles. */
  const groups = useMemo<Group[]>(() => {
    const byDay: Group[] = [];
    let currentDay: Group | null = null;
    let currentRun: Group['runs'][number] | null = null;
    for (const m of messages) {
      const dayKey = formatDayLabel(m.createdAt);
      if (!currentDay || currentDay.day !== dayKey) {
        currentDay = { day: dayKey, runs: [] };
        byDay.push(currentDay);
        currentRun = null;
      }
      const isSystem = m.type === 'SYSTEM';
      if (
        !currentRun ||
        currentRun.senderId !== m.senderId ||
        currentRun.isSystem !== isSystem
      ) {
        currentRun = { senderId: m.senderId, msgs: [m], isSystem };
        currentDay.runs.push(currentRun);
      } else {
        currentRun.msgs.push(m);
      }
    }
    return byDay;
  }, [messages]);

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.day}>
          <DaySeparator label={g.day} />
          <div className="space-y-2.5">
            {g.runs.map((run, runIdx) => {
              if (run.isSystem) {
                return (
                  <div key={`${g.day}-${runIdx}`} className="space-y-2">
                    {run.msgs.map((m) => (
                      <SystemEvent key={m.id} content={m.content} />
                    ))}
                  </div>
                );
              }
              const isOwn = run.senderId === ownId;
              return (
                <BubbleRun
                  key={`${g.day}-${runIdx}`}
                  msgs={run.msgs}
                  isOwn={isOwn}
                  counterparty={counterparty}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border" />
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function SystemEvent({ content }: { content: string }) {
  return (
    <div className="text-center my-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 ring-1 ring-border px-3 py-1 rounded-full max-w-[90%]">
        <Sparkles className="h-3 w-3 text-accent" strokeWidth={2.5} />
        {content}
      </span>
    </div>
  );
}

function BubbleRun({
  msgs,
  isOwn,
  counterparty,
}: {
  msgs: ChatMessage[];
  isOwn: boolean;
  counterparty: ChatUser | null;
}) {
  return (
    <div className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="self-end mb-1">
          <Avatar user={counterparty} size="sm" />
        </div>
      )}
      <div className={`flex flex-col gap-0.5 max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {msgs.map((m, i) => {
          const first = i === 0;
          const last = i === msgs.length - 1;
          return (
            <Bubble
              key={m.id}
              msg={m}
              isOwn={isOwn}
              firstOfRun={first}
              lastOfRun={last}
            />
          );
        })}
      </div>
    </div>
  );
}

function Bubble({
  msg,
  isOwn,
  firstOfRun,
  lastOfRun,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  firstOfRun: boolean;
  lastOfRun: boolean;
}) {
  /* Bubble corner radii — squash the side where the bubble joins its
     neighbour so the group reads as a single thread visually. */
  const radii = isOwn
    ? `${firstOfRun ? 'rounded-tr-2xl' : 'rounded-tr-md'} rounded-tl-2xl rounded-bl-2xl ${lastOfRun ? 'rounded-br-md' : 'rounded-br-md'}`
    : `${firstOfRun ? 'rounded-tl-2xl' : 'rounded-tl-md'} rounded-tr-2xl rounded-br-2xl ${lastOfRun ? 'rounded-bl-md' : 'rounded-bl-md'}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: EASE }}
      className={`
        group relative px-3.5 py-2 ${radii}
        ${isOwn
          ? 'bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.45)]'
          : 'bg-surface ring-1 ring-border text-foreground'}
      `}
    >
      <p className="text-[14px] whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
      {lastOfRun && (
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] tabular-nums ${
            isOwn ? 'text-primary-foreground/75 justify-end' : 'text-muted-foreground'
          }`}
        >
          <span>{formatTime(msg.createdAt)}</span>
          {isOwn &&
            (msg.readAt ? (
              <CheckCheck className="h-3 w-3" strokeWidth={2.5} />
            ) : (
              <Check className="h-3 w-3" strokeWidth={2.5} />
            ))}
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  TYPING INDICATOR — three bouncing dots                              */
/* ══════════════════════════════════════════════════════════════════ */
function TypingIndicator({
  visible,
  counterparty,
}: {
  visible: boolean;
  counterparty: ChatUser | null;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="flex items-end gap-2 mt-2"
        >
          <Avatar user={counterparty} size="sm" />
          <div className="inline-flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-md bg-surface ring-1 ring-border">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-1.5 w-1.5 rounded-full bg-muted-foreground"
                animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  delay: i * 0.18,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  QUICK REPLIES                                                       */
/* ══════════════════════════════════════════════════════════════════ */
function QuickReplies({
  onPick,
  onDismiss,
}: {
  onPick: (text: string) => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="border-t border-border bg-surface/50 px-3 sm:px-4 py-2.5 flex items-center gap-2 overflow-x-auto"
    >
      <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground font-bold shrink-0">
        Quick
      </span>
      <div className="flex items-center gap-1.5">
        {QUICK_REPLIES.map((q) => (
          <motion.button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center h-7 px-3 rounded-full bg-muted/30 hover:bg-muted/55 text-[12px] font-medium whitespace-nowrap transition-colors"
          >
            {q}
          </motion.button>
        ))}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hide quick replies"
        className="ml-auto shrink-0 text-[10.5px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Hide
      </button>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  EMPTY STATE                                                         */
/* ══════════════════════════════════════════════════════════════════ */
function ChatEmptyState() {
  return (
    <div className="grid place-items-center h-full min-h-[200px] text-center">
      <div>
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 text-primary mb-3">
          <MessageSquare className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="font-display font-bold text-[14px] mb-1">Start the conversation</div>
        <div className="text-[12px] text-muted-foreground max-w-xs px-4">
          Say hi to the buyer, confirm what they need, and start delivery.
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  AVATAR — gradient initials                                          */
/* ══════════════════════════════════════════════════════════════════ */
export function Avatar({
  user,
  size = 'md',
  online,
}: {
  user: ChatUser | null;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}) {
  const dim =
    size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-[15px]' : 'h-9 w-9 text-[12px]';
  const dot = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  return (
    <div className="relative shrink-0">
      <div
        className={`grid place-items-center rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold ring-2 ring-surface ${dim}`}
      >
        {user?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          initials(user)
        )}
      </div>
      {online && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-success ring-2 ring-surface ${dot}`}
        />
      )}
    </div>
  );
}
