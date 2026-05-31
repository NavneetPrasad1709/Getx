'use client';

import { useState } from 'react';
import { Banknote, Check, X, Loader2 } from 'lucide-react';
import { Button, toast } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import {
  useAdminWithdrawals,
  useApproveWithdrawal,
  useRejectWithdrawal,
  type AdminWithdrawalRow,
} from '@/hooks/use-admin';
import { extractMessage } from '@/lib/api-error';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID', 'all'] as const;

function money(v: number | string): string {
  return `$${Number(v).toFixed(2)}`;
}

export default function WithdrawalsPage() {
  const [status, setStatus] = useState<string>('PENDING');
  const list = useAdminWithdrawals(status === 'all' ? undefined : status);
  const approve = useApproveWithdrawal();
  const reject = useRejectWithdrawal();
  const [busyId, setBusyId] = useState<string | null>(null);

  const onApprove = async (w: AdminWithdrawalRow) => {
    setBusyId(w.id);
    try {
      await approve.mutateAsync({ id: w.id });
      toast.success(`Approved ${w.withdrawalNumber}`);
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (w: AdminWithdrawalRow) => {
    const reason = window.prompt(
      `Reject ${w.withdrawalNumber}? Enter a reason (min 5 chars):`,
    );
    if (reason === null) return;
    if (reason.trim().length < 5) {
      toast.error('Reason must be at least 5 characters.');
      return;
    }
    setBusyId(w.id);
    try {
      await reject.mutateAsync({ id: w.id, reason: reason.trim() });
      toast.success(`Rejected ${w.withdrawalNumber}`);
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  const rows = list.data ?? [];

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
            <Banknote className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-[24px] tracking-tight">
              Withdrawals
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Review and action seller payout requests.
            </p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-5">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`h-8 px-3 rounded-full text-[12px] font-semibold ring-1 transition-colors ${
                status === s
                  ? 'bg-primary text-primary-foreground ring-primary'
                  : 'bg-surface ring-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All' : s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {list.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-[13px] py-10">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading withdrawals…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-surface ring-1 ring-border p-10 text-center text-muted-foreground text-[13.5px]">
            No {status === 'all' ? '' : status.toLowerCase()} withdrawals.
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((w) => (
              <div
                key={w.id}
                className="rounded-2xl bg-surface ring-1 ring-border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-bold">
                      {w.withdrawalNumber}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground">
                      {w.status}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                    {w.user.name ?? w.user.username ?? w.user.email} · {w.method}
                  </div>
                </div>

                <div className="text-right sm:w-40 shrink-0">
                  <div className="font-display font-bold text-[16px] tabular-nums">
                    {money(w.netAmount)}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {money(w.amount)} − {money(w.fee)} fee
                  </div>
                </div>

                {w.status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => onApprove(w)}
                      disabled={busyId === w.id}
                    >
                      {busyId === w.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReject(w)}
                      disabled={busyId === w.id}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
