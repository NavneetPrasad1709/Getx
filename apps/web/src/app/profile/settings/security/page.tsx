'use client';

import * as React from 'react';
import { AxiosError } from 'axios';
import { Button, Input, toast } from '@getx/ui';
import { ShieldAlert, Lock, KeyRound } from 'lucide-react';
import { useChangePassword } from '@/hooks/use-account';

export default function SecurityPage() {
  const change = useChangePassword();
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error('New passwords don’t match');
      return;
    }
    try {
      await change.mutateAsync({
        currentPassword: current,
        newPassword: next,
      });
      toast.success('Password updated. Other sessions signed out.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not change password');
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border/60 bg-surface/60 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-5">
          <span className="h-10 w-10 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] grid place-items-center">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold">
              Change password
            </h2>
            <p className="text-[12px] text-muted-foreground">
              Updating your password signs you out of all other devices.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-[12px] font-semibold mb-1.5">
              Current password
            </label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold mb-1.5">
              New password
            </label>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              At least 8 characters with one uppercase, lowercase, and digit.
            </p>
          </div>
          <div>
            <label className="block text-[12px] font-semibold mb-1.5">
              Confirm new password
            </label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button
            type="submit"
            loading={change.isPending}
            loadingText="Updating…"
            className="rounded-full"
            disabled={!current || !next || !confirm}
          >
            Update password
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-border/60 bg-surface/60 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] grid place-items-center">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
                Two-factor authentication
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[hsl(28_92%_55%/0.15)] text-[hsl(28_92%_55%)] text-[10px] font-bold uppercase tracking-wider">
                  Coming soon
                </span>
              </h2>
              <p className="text-[12px] text-muted-foreground max-w-md">
                Scan a QR with Google Authenticator / Authy and confirm a
                6-digit code on each sign-in. We’re finishing the TOTP flow
                and will email you when it ships.
              </p>
            </div>
          </div>
          <Button variant="outline" disabled className="rounded-full">
            Set up
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-[hsl(var(--error)/0.3)] bg-[hsl(var(--error)/0.04)] p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 text-[hsl(var(--error))] mt-0.5 shrink-0" />
          <p className="text-[12.5px] text-foreground/85">
            Spotted a sign-in you didn’t make? Change your password now and{' '}
            <a
              href="mailto:support@getx.live?subject=Suspicious%20sign-in"
              className="font-semibold text-[hsl(var(--error))] underline"
            >
              email support@getx.live
            </a>{' '}
            so we can lock the account and review activity.
          </p>
        </div>
      </section>
    </div>
  );
}
