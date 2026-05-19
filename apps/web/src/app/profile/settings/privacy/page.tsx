'use client';

import * as React from 'react';
import { AxiosError } from 'axios';
import {
  Download,
  Trash2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button, Input, Skeleton, toast } from '@getx/ui';
import {
  useDataExports,
  useDeleteAccount,
  useRequestDataExport,
  type DataExport,
} from '@/hooks/use-account';
import { useAuth } from '@/hooks/use-auth';

export default function PrivacyPage() {
  const { logout } = useAuth();
  const { data: exports, isLoading } = useDataExports();
  const requestExport = useRequestDataExport();
  const deleteAccount = useDeleteAccount();

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmStep, setConfirmStep] = React.useState<1 | 2>(1);
  const [confirmText, setConfirmText] = React.useState('');
  const [password, setPassword] = React.useState('');

  const onExport = async () => {
    try {
      await requestExport.mutateAsync();
      toast.success('Export queued — we email you when the zip is ready');
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not request export');
    }
  };

  const onDelete = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      toast.error('Type DELETE MY ACCOUNT to confirm');
      return;
    }
    try {
      const res = await deleteAccount.mutateAsync({
        confirm: 'DELETE MY ACCOUNT',
        password,
      });
      toast.success(
        `Account scheduled for deletion. Reverse before ${new Date(res.gracePeriodEndsAt).toLocaleDateString()}.`,
      );
      setConfirmOpen(false);
      void logout();
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not delete account');
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border/60 bg-surface/60 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-lg font-extrabold inline-flex items-center gap-2">
              <Download className="h-4 w-4 text-[hsl(var(--primary))]" />
              Download your data
            </h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground max-w-md">
              Get a zip of your profile, orders, messages, reviews, and
              wallet ledger. We email a download link once the zip is ready
              (usually within 24 hours).
            </p>
          </div>
          <Button
            onClick={onExport}
            loading={requestExport.isPending}
            loadingText="Queueing…"
            variant="outline"
            className="rounded-full shrink-0"
          >
            Request export
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-12 rounded-xl" />
        ) : !exports || exports.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            No previous exports.
          </p>
        ) : (
          <ul className="divide-y divide-border/40 mt-4">
            {exports.map((row) => (
              <ExportRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-[hsl(var(--error)/0.35)] bg-[hsl(var(--error)/0.04)] p-6 md:p-8">
        <div className="flex items-start gap-3 mb-3">
          <ShieldAlert className="h-5 w-5 text-[hsl(var(--error))] mt-0.5 shrink-0" />
          <div>
            <h2 className="font-display text-lg font-extrabold">
              Delete account
            </h2>
            <p className="mt-1 text-[12.5px] text-foreground/80 max-w-md">
              Soft-deletes within seconds. We retain order history for
              tax + legal reasons. 30-day grace period — reach support to
              undo before then. After 30 days we anonymise all PII
              permanently.
            </p>
          </div>
        </div>

        {!confirmOpen ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setConfirmStep(1);
              setConfirmText('');
              setPassword('');
              setConfirmOpen(true);
            }}
            className="rounded-full border-[hsl(var(--error)/0.45)] text-[hsl(var(--error))] hover:bg-[hsl(var(--error)/0.08)]"
          >
            <Trash2 className="h-4 w-4" />
            Delete my account
          </Button>
        ) : confirmStep === 1 ? (
          <div className="rounded-2xl bg-[hsl(var(--background))] border border-[hsl(var(--error)/0.3)] p-5">
            <p className="text-[13px] font-semibold mb-3">
              Are you sure? This signs you out everywhere immediately.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setConfirmStep(2)}
                className="rounded-full bg-[hsl(var(--error))] hover:bg-[hsl(var(--error)/0.85)]"
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[hsl(var(--background))] border border-[hsl(var(--error)/0.3)] p-5 space-y-3">
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">
                Type <span className="font-mono">DELETE MY ACCOUNT</span> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">
                Current password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={onDelete}
                loading={deleteAccount.isPending}
                loadingText="Deleting…"
                disabled={confirmText !== 'DELETE MY ACCOUNT' || !password}
                className="rounded-full bg-[hsl(var(--error))] hover:bg-[hsl(var(--error)/0.85)]"
              >
                Permanently delete
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ExportRow({ row }: { row: DataExport }) {
  const { icon: Icon, cls, label } = (() => {
    if (row.status === 'READY')
      return {
        icon: CheckCircle2,
        cls: 'text-[hsl(var(--success))]',
        label: 'Ready',
      };
    if (row.status === 'FAILED' || row.status === 'EXPIRED')
      return {
        icon: XCircle,
        cls: 'text-[hsl(var(--error))]',
        label: row.status === 'FAILED' ? 'Failed' : 'Expired',
      };
    return {
      icon: Clock,
      cls: 'text-[hsl(28_92%_55%)]',
      label: row.status === 'PROCESSING' ? 'Processing' : 'Queued',
    };
  })();

  return (
    <li className="py-3 flex items-center gap-3">
      <Icon className={`h-4 w-4 ${cls} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold capitalize">{label}</div>
        <div className="text-[11px] text-muted-foreground">
          Requested {new Date(row.requestedAt).toLocaleString()}
        </div>
      </div>
      {row.fileUrl && row.status === 'READY' ? (
        <a
          href={row.fileUrl}
          className="text-[12px] font-semibold text-[hsl(var(--primary))] hover:underline"
        >
          Download
        </a>
      ) : null}
    </li>
  );
}
