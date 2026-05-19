'use client';

import * as React from 'react';
import { AxiosError } from 'axios';
import { Plus, Trash2, Star, CreditCard } from 'lucide-react';
import { Button, Input, Skeleton, toast } from '@getx/ui';
import {
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  usePaymentMethods,
  useUpdatePaymentMethod,
  type PaymentMethod,
} from '@/hooks/use-payment-methods';

export default function PaymentMethodsPage() {
  const { data, isLoading } = usePaymentMethods();
  const create = useCreatePaymentMethod();
  const update = useUpdatePaymentMethod();
  const remove = useDeletePaymentMethod();

  const [showAdd, setShowAdd] = React.useState(false);
  const [upiId, setUpiId] = React.useState('');
  const [label, setLabel] = React.useState('');

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[\w.\-]+@[\w.\-]+$/i.test(upiId)) {
      toast.error('Invalid UPI ID');
      return;
    }
    try {
      await create.mutateAsync({
        type: 'UPI',
        upiId,
        label: label || undefined,
      });
      toast.success('UPI saved');
      setUpiId('');
      setLabel('');
      setShowAdd(false);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not save UPI');
    }
  };

  const onMakeDefault = async (m: PaymentMethod) => {
    if (m.isDefault) return;
    try {
      await update.mutateAsync({ id: m.id, isDefault: true });
      toast.success('Set as default');
    } catch {
      toast.error('Could not set default');
    }
  };

  const onRemove = async (m: PaymentMethod) => {
    if (!confirm(`Remove ${m.upiId ?? 'this method'}?`)) return;
    try {
      await remove.mutateAsync(m.id);
      toast.success('Removed');
    } catch {
      toast.error('Could not remove');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[14px] text-muted-foreground max-w-xl">
          Save UPI IDs to speed up withdrawals and checkout. The default UPI
          is pre-selected when you request a payout.
        </p>
        <Button
          onClick={() => setShowAdd((s) => !s)}
          variant={showAdd ? 'ghost' : 'default'}
          className="rounded-full shrink-0"
        >
          <Plus className="h-4 w-4" />
          {showAdd ? 'Close' : 'Add UPI'}
        </Button>
      </div>

      {showAdd ? (
        <form
          onSubmit={onAdd}
          className="rounded-3xl border border-border/60 bg-surface/60 p-5 space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">
                UPI ID
              </label>
              <Input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">
                Label (optional)
              </label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. PhonePe personal"
                maxLength={40}
              />
            </div>
          </div>
          <Button
            type="submit"
            loading={create.isPending}
            loadingText="Saving…"
            className="rounded-full"
            disabled={!upiId}
          >
            Save UPI
          </Button>
        </form>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {data.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-border/60 bg-surface/60 p-5 flex items-center gap-4"
            >
              <span className="h-10 w-10 rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] grid place-items-center shrink-0">
                <CreditCard className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-display text-[14px] font-extrabold truncate">
                    {m.upiId ?? m.cardLast4 ?? 'Payment method'}
                  </span>
                  {m.isDefault ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] text-[10px] font-bold uppercase tracking-wider">
                      Default
                    </span>
                  ) : null}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  {m.label ?? `${m.type} · added ${new Date(m.createdAt).toLocaleDateString()}`}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!m.isDefault ? (
                  <button
                    type="button"
                    onClick={() => onMakeDefault(m)}
                    aria-label="Set as default"
                    className="inline-flex h-8 items-center gap-1 px-2 rounded-full text-[11px] font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.08)]"
                  >
                    <Star className="h-3 w-3" />
                    Default
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemove(m)}
                  aria-label="Remove"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[hsl(var(--error)/0.1)] hover:text-[hsl(var(--error))]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface/40 p-10 text-center">
      <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[hsl(var(--primary)/0.1)] grid place-items-center">
        <CreditCard className="h-5 w-5 text-[hsl(var(--primary))]" />
      </div>
      <h3 className="font-display text-lg font-extrabold mb-1">
        No saved UPI yet
      </h3>
      <p className="text-[12.5px] text-muted-foreground max-w-sm mx-auto">
        Add a UPI ID to skip re-entering it during withdrawals. We never
        share it with sellers.
      </p>
    </div>
  );
}
