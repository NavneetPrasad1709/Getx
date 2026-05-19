'use client';

import * as React from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  Gift,
  CircleArrowUp,
  CircleArrowDown,
  RotateCcw,
  Coins,
  X,
} from 'lucide-react';
import {
  Button,
  Skeleton,
  Input,
  toast,
} from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useAuth } from '@/hooks/use-auth';
import {
  useWallet,
  useWithdraw,
  type WalletTxn,
  type WalletTxnType,
} from '@/hooks/use-wallet';
import { formatMoney as formatCurrency } from '@/lib/currency';

type Tab = 'all' | 'earned' | 'spent' | 'withdrawn';

const EARNED_TYPES: WalletTxnType[] = ['CASHBACK', 'BONUS', 'REFERRAL', 'REFUND', 'ORDER_RELEASED'];
const SPENT_TYPES: WalletTxnType[] = ['SPEND', 'ADJUSTMENT'];
const WITHDRAWN_TYPES: WalletTxnType[] = ['WITHDRAWAL', 'WITHDRAWAL_FEE'];

function chipFor(t: WalletTxnType): { label: string; cls: string } {
  switch (t) {
    case 'CASHBACK':
      return {
        label: 'Cashback',
        cls: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
      };
    case 'BONUS':
      return {
        label: 'Bonus',
        cls: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
      };
    case 'REFERRAL':
      return {
        label: 'Referral',
        cls: 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]',
      };
    case 'REFUND':
      return {
        label: 'Refund',
        cls: 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]',
      };
    case 'ORDER_RELEASED':
      return {
        label: 'Earnings',
        cls: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
      };
    case 'SPEND':
      return {
        label: 'Spend',
        cls: 'bg-[hsl(var(--muted-foreground)/0.18)] text-[hsl(var(--muted-foreground))]',
      };
    case 'ADJUSTMENT':
      return {
        label: 'Adjustment',
        cls: 'bg-[hsl(var(--muted-foreground)/0.15)] text-[hsl(var(--muted-foreground))]',
      };
    case 'WITHDRAWAL':
      return {
        label: 'Withdrawal',
        cls: 'bg-[hsl(28_92%_55%/0.15)] text-[hsl(28_92%_55%)]',
      };
    case 'WITHDRAWAL_FEE':
      return {
        label: 'Withdraw fee',
        cls: 'bg-[hsl(28_92%_55%/0.1)] text-[hsl(28_92%_55%)]',
      };
    case 'CHARGEBACK':
      return {
        label: 'Chargeback',
        cls: 'bg-[hsl(var(--error)/0.15)] text-[hsl(var(--error))]',
      };
  }
}

function iconFor(t: WalletTxnType): React.ComponentType<{ className?: string }> {
  if (EARNED_TYPES.includes(t)) return CircleArrowUp;
  if (SPENT_TYPES.includes(t)) return CircleArrowDown;
  if (WITHDRAWN_TYPES.includes(t)) return ArrowDownToLine;
  if (t === 'REFUND') return RotateCcw;
  return Coins;
}

function filterByTab(rows: WalletTxn[], tab: Tab): WalletTxn[] {
  if (tab === 'all') return rows;
  if (tab === 'earned') return rows.filter((r) => EARNED_TYPES.includes(r.type) && r.amount > 0);
  if (tab === 'spent') return rows.filter((r) => SPENT_TYPES.includes(r.type) || r.amount < 0 && WITHDRAWN_TYPES.indexOf(r.type) === -1);
  return rows.filter((r) => WITHDRAWN_TYPES.includes(r.type));
}

export default function WalletPage() {
  const { isAuthenticated, loading } = useAuth();
  const { data, isLoading } = useWallet(isAuthenticated);
  const [tab, setTab] = React.useState<Tab>('all');
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !isAuthenticated && typeof window !== 'undefined') {
      window.location.assign('/auth/login?next=' + encodeURIComponent('/profile/wallet'));
    }
  }, [loading, isAuthenticated]);

  const balance = data?.balance ?? 0;
  const ledger = data?.ledger ?? [];
  const currency = ledger[0]?.currency ?? 'INR';
  const filtered = filterByTab(ledger, tab);
  const lastCashback = ledger.find((r) => r.type === 'CASHBACK');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-3xl pt-24 pb-20">
        <nav
          aria-label="Breadcrumb"
          className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          <Link href="/profile" className="hover:text-foreground">
            Profile
          </Link>
          <span aria-hidden className="mx-2">·</span>
          <span className="text-foreground">Wallet</span>
        </nav>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
          GETX Coins
        </h1>

        {/* Balance hero */}
        <section className="mt-6 rounded-3xl border border-[hsl(var(--primary)/0.3)] bg-[linear-gradient(135deg,hsl(var(--primary)/0.08)_0%,hsl(var(--primary)/0.02)_100%)] p-6 md:p-8">
          <div className="grid md:grid-cols-[1fr_auto] items-center gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                <WalletIcon className="h-3 w-3 text-[hsl(var(--primary))]" />
                Current balance
              </div>
              {isLoading ? (
                <Skeleton className="h-12 w-48" />
              ) : (
                <div className="font-display text-5xl md:text-6xl font-extrabold tabular-nums text-[hsl(var(--foreground))] leading-none">
                  {formatCurrency(balance, currency)}
                </div>
              )}
              <div className="mt-3 text-[13px] text-muted-foreground">
                {lastCashback
                  ? `Last credit · ${formatCurrency(lastCashback.amount, lastCashback.currency)} · ${new Date(lastCashback.createdAt).toLocaleDateString()}`
                  : 'No cashback credited yet — your next order earns 1%.'}
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <Button
                onClick={() => setWithdrawOpen(true)}
                disabled={balance <= 0}
                size="lg"
                className="rounded-full"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Withdraw
              </Button>
              <span className="text-[11px] text-muted-foreground">PayPal · Wise · UPI · Bank · 24h review</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[hsl(var(--surface))] border border-border/40 px-4 py-3 flex items-center gap-3">
            <span className="h-8 w-8 rounded-full bg-[hsl(var(--primary)/0.12)] grid place-items-center shrink-0">
              <Gift className="h-4 w-4 text-[hsl(var(--primary))]" />
            </span>
            <div className="text-[12.5px] text-muted-foreground">
              <span className="font-semibold text-foreground">Earn 1% cashback on every completed order.</span>{' '}
              No expiry. Apply up to 50% of any order at checkout.
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="mt-8 flex items-center gap-1 border-b border-border/40 overflow-x-auto">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'earned', label: 'Earned' },
              { key: 'spent', label: 'Spent' },
              { key: 'withdrawn', label: 'Withdrawn' },
            ] as Array<{ key: Tab; label: string }>
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                tab === t.key
                  ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]'
                  : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Ledger */}
        <section className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-surface/40 p-10 text-center text-sm text-muted-foreground">
              No transactions yet in this view.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {filtered.map((row) => (
                <LedgerRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </section>
      </main>

      {withdrawOpen ? (
        <WithdrawModal
          balance={balance}
          currency={currency}
          onClose={() => setWithdrawOpen(false)}
        />
      ) : null}

      <LandingFooter />
    </div>
  );
}

function LedgerRow({ row }: { row: WalletTxn }) {
  const chip = chipFor(row.type);
  const Icon = iconFor(row.type);
  const isCredit = row.amount > 0;
  return (
    <li className="py-4 flex items-center gap-4">
      <span
        className={`h-10 w-10 rounded-full grid place-items-center shrink-0 ${chip.cls}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-foreground truncate">
          {row.description}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${chip.cls}`}
          >
            {chip.label}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {new Date(row.createdAt).toLocaleString()}
          </span>
          {row.orderId ? (
            <>
              <span aria-hidden>·</span>
              <Link
                href={`/orders/${row.orderId}`}
                className="text-[hsl(var(--primary))] hover:underline"
              >
                View order
              </Link>
            </>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div
          className={`font-display text-[15px] font-extrabold tabular-nums ${
            isCredit ? 'text-[hsl(var(--success))]' : 'text-foreground'
          }`}
        >
          {isCredit ? '+' : ''}
          {formatCurrency(row.amount, row.currency)}
        </div>
        <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">
          Bal {formatCurrency(row.balanceAfter, row.currency)}
        </div>
      </div>
    </li>
  );
}

type WithdrawMethod = 'UPI' | 'PAYPAL' | 'WISE' | 'BANK_TRANSFER_INTL';

const METHOD_MIN: Record<WithdrawMethod, number> = {
  UPI: 100,
  PAYPAL: 10,
  WISE: 20,
  BANK_TRANSFER_INTL: 50,
};

const METHOD_LABEL: Record<WithdrawMethod, { label: string; sub: string }> = {
  UPI: { label: 'UPI', sub: 'India · 24h · min $1.20' },
  PAYPAL: { label: 'PayPal', sub: 'Global · 24h · min $10' },
  WISE: { label: 'Wise', sub: 'Global · 24h · min $20' },
  BANK_TRANSFER_INTL: { label: 'Bank transfer', sub: 'Global · 2-3d · min $50' },
};

function WithdrawModal({
  balance,
  currency,
  onClose,
}: {
  balance: number;
  currency: string;
  onClose: () => void;
}) {
  const withdraw = useWithdraw();
  /* Default method picks UPI for INR users, else PayPal — matches the
     most common per-currency rail without forcing a choice. */
  const initialMethod: WithdrawMethod =
    currency.toUpperCase() === 'INR' ? 'UPI' : 'PAYPAL';
  const [method, setMethod] = React.useState<WithdrawMethod>(initialMethod);
  const min = METHOD_MIN[method];
  const max = Math.floor(balance);
  const [amount, setAmount] = React.useState<number>(Math.max(min, max));

  /* Per-method credentials — only the active method's fields apply. */
  const [upiId, setUpiId] = React.useState('');
  const [paypalEmail, setPaypalEmail] = React.useState('');
  const [wiseEmail, setWiseEmail] = React.useState('');
  const [holderName, setHolderName] = React.useState('');
  const [iban, setIban] = React.useState('');
  const [bic, setBic] = React.useState('');
  const [bankName, setBankName] = React.useState('');

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* When method flips, ensure amount stays within the new min. */
  React.useEffect(() => {
    if (amount < METHOD_MIN[method]) setAmount(Math.max(METHOD_MIN[method], max));
  }, [method, amount, max]);

  const credsValid = (() => {
    if (method === 'UPI') return /^[\w.\-]+@[\w.\-]+$/i.test(upiId);
    if (method === 'PAYPAL') return /^\S+@\S+\.\S+$/.test(paypalEmail);
    if (method === 'WISE') return /^\S+@\S+\.\S+$/.test(wiseEmail);
    return (
      holderName.length >= 2 &&
      iban.length >= 15 &&
      bic.length >= 8 &&
      bankName.length >= 2
    );
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < min) {
      toast.error(`Minimum withdrawal is ${formatCurrency(min, currency)}`);
      return;
    }
    if (amount > max) {
      toast.error('Amount exceeds your balance');
      return;
    }
    if (!credsValid) {
      toast.error('Enter valid payout details');
      return;
    }
    try {
      const payload = (() => {
        if (method === 'UPI') return { method, amount, upiId } as const;
        if (method === 'PAYPAL') return { method, amount, paypalEmail } as const;
        if (method === 'WISE') return { method, amount, wiseEmail } as const;
        return {
          method,
          amount,
          holderName,
          iban,
          bic,
          bankName,
        } as const;
      })();
      await withdraw.mutateAsync(payload);
      toast.success('Withdrawal requested. We’ll process within 24 hours.');
      onClose();
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not request withdrawal');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Withdraw funds"
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm grid place-items-center p-4"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-[hsl(var(--background))] border border-border/60 shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-xl font-extrabold">
              Withdraw funds
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Available {formatCurrency(balance, currency)} · processed within 24 hours
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full grid place-items-center text-muted-foreground hover:bg-[hsl(var(--surface-elevated))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Method picker */}
        <label className="block text-[12px] font-semibold text-foreground mb-2">
          Payout method
        </label>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {(Object.keys(METHOD_LABEL) as WithdrawMethod[]).map((m) => {
            const active = m === method;
            const info = METHOD_LABEL[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  active
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)]'
                    : 'border-border/60 hover:border-[hsl(var(--primary)/0.4)]'
                }`}
              >
                <div className="text-[13px] font-semibold">{info.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {info.sub}
                </div>
              </button>
            );
          })}
        </div>

        {/* Amount */}
        <label className="block text-[12px] font-semibold text-foreground mb-1.5">
          Amount
        </label>
        <Input
          type="number"
          min={min}
          max={max}
          step={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mb-1"
        />
        <input
          type="range"
          min={Math.min(min, max)}
          max={Math.max(min, max)}
          step={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-[hsl(var(--primary))]"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>Min {formatCurrency(min, currency)}</span>
          <span>Max {formatCurrency(max, currency)}</span>
        </div>

        {/* Per-method fields */}
        <div className="mt-5 space-y-3">
          {method === 'UPI' ? (
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">UPI ID</label>
              <Input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi"
                autoComplete="off"
              />
            </div>
          ) : null}

          {method === 'PAYPAL' ? (
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">PayPal email</label>
              <Input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          ) : null}

          {method === 'WISE' ? (
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">Wise email</label>
              <Input
                type="email"
                value={wiseEmail}
                onChange={(e) => setWiseEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          ) : null}

          {method === 'BANK_TRANSFER_INTL' ? (
            <>
              <div>
                <label className="block text-[12px] font-semibold mb-1.5">Account holder name</label>
                <Input
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5">IBAN</label>
                  <Input
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder="DE89 3704 0044 0532 0130 00"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5">BIC / SWIFT</label>
                  <Input
                    value={bic}
                    onChange={(e) => setBic(e.target.value.toUpperCase())}
                    placeholder="COBADEFFXXX"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1.5">Bank name</label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
            </>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            Payouts route to these details after admin review.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button
            type="submit"
            loading={withdraw.isPending}
            loadingText="Submitting…"
            className="rounded-full"
            disabled={amount < min || amount > max || !credsValid}
          >
            Request withdrawal
          </Button>
        </div>
      </form>
    </div>
  );
}
