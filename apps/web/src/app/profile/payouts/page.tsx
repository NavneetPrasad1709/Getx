'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Button, Skeleton, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { api } from '@/lib/api';

/* /profile/payouts — Stripe Connect Express onboarding entry point.

   Flow:
     1. Seller lands → we read /payouts/connect/status
     2. If detailsSubmitted=false → big "Set up payouts" CTA that POSTs
        /payouts/connect/start and hard-redirects to the returned URL
     3. After Stripe redirects them back to ?onboarded=1, we re-poll
        status (webhook may take a few seconds to flip caps) and toast
     4. Once chargesEnabled + payoutsEnabled both true → green "ready"
        state with payout-rail unlocks listed inline */

interface ConnectStatus {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardedAt: string | null;
}

function useConnectStatus() {
  return useQuery<ConnectStatus>({
    queryKey: ['payouts', 'connect', 'status'],
    queryFn: async () => {
      const { data } = await api.get<ConnectStatus>('/payouts/connect/status');
      return data;
    },
    staleTime: 10_000,
    /* Poll on focus + 6s while not fully ready so the page reflects
       capability flips that arrive via webhook a few seconds later. */
    refetchOnWindowFocus: true,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (data && data.chargesEnabled && data.payoutsEnabled) return false;
      return 6_000;
    },
  });
}

function useStartConnect() {
  return useMutation<{ url: string; expiresAt: string }, Error, void>({
    mutationFn: async () => {
      const { data } = await api.post<{ url: string; expiresAt: string }>(
        '/payouts/connect/start',
        {},
      );
      return data;
    },
  });
}

export default function PayoutsPage() {
  return (
    <React.Suspense fallback={<PayoutsSkeleton />}>
      <PayoutsInner />
    </React.Suspense>
  );
}

function PayoutsSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="container max-w-4xl py-10">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-64 rounded-2xl" />
      </main>
      <LandingFooter />
    </div>
  );
}

function PayoutsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: status, isLoading } = useConnectStatus();
  const start = useStartConnect();

  /* Toast on return from Stripe + invalidate so the new caps land
     even if the webhook beat the navigation. */
  React.useEffect(() => {
    if (sp.get('onboarded') === '1') {
      toast.success('Onboarding submitted — Stripe is verifying your details.');
      void qc.invalidateQueries({ queryKey: ['payouts', 'connect', 'status'] });
      router.replace('/profile/payouts');
    }
  }, [sp, qc, router]);

  const handleStart = async () => {
    try {
      const { url } = await start.mutateAsync();
      window.location.assign(url);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not start onboarding';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />
      <section className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground mb-3 inline-flex items-center gap-2">
          <Banknote className="h-3 w-3" />
          Seller payouts
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
          Get paid faster with Stripe Connect
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-2xl">
          Connect a bank account once and we route your sale earnings straight
          there — no admin queue, no 24-hour wait. Manual UPI + PayPal still
          work, but Wise + bank-transfer rails require Connect.
        </p>

        <div className="mt-8 surface-cinematic rounded-3xl p-6 md:p-8">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-12 w-40 mt-3" />
            </div>
          ) : status?.chargesEnabled && status?.payoutsEnabled ? (
            <ReadyState status={status} />
          ) : status?.detailsSubmitted ? (
            <PendingState />
          ) : (
            <NotStartedState onStart={handleStart} busy={start.isPending} />
          )}
        </div>

        <RailsTable connected={!!status?.payoutsEnabled} />
      </section>
      <LandingFooter />
    </div>
  );
}

function NotStartedState({
  onStart,
  busy,
}: {
  onStart: () => void;
  busy: boolean;
}) {
  return (
    <>
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-2xl bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))] grid place-items-center shrink-0">
          <Banknote className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">
            Set up payouts in ~3 minutes
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            Stripe will ask for your name, date of birth, and bank account.
            You can pause and resume any time — we save your progress.
          </p>
        </div>
      </div>
      <Button
        type="button"
        onClick={onStart}
        loading={busy}
        loadingText="Loading Stripe…"
        size="xl"
        className="mt-6 rounded-full"
      >
        Set up payouts
        <ExternalLink className="h-4 w-4" />
      </Button>
      <p className="mt-4 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3" />
        Identity verification handled by Stripe. GETX never sees your bank
        login.
      </p>
    </>
  );
}

function PendingState() {
  return (
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 rounded-2xl bg-[hsl(45_95%_55%/0.18)] text-[hsl(45_95%_55%)] grid place-items-center shrink-0">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold">
          Stripe is reviewing your details
        </h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          Most verifications finish in under an hour. We&apos;ll email you the
          moment your account is ready. You can keep selling — earnings still
          accrue to your wallet.
        </p>
      </div>
    </div>
  );
}

function ReadyState({ status }: { status: ConnectStatus }) {
  return (
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 rounded-2xl bg-[hsl(var(--success)/0.18)] text-[hsl(var(--success))] grid place-items-center shrink-0">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold">Payouts unlocked</h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          Connect account{' '}
          <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-foreground/8">
            {status.accountId}
          </code>{' '}
          ready since{' '}
          {status.onboardedAt
            ? new Date(status.onboardedAt).toLocaleDateString()
            : 'recently'}
          . Withdraw via Wise or bank transfer from your wallet page.
        </p>
      </div>
    </div>
  );
}

function RailsTable({ connected }: { connected: boolean }) {
  const rails = [
    { name: 'UPI (India)', requiresConnect: false, status: 'Always on' },
    { name: 'PayPal', requiresConnect: false, status: 'Always on' },
    { name: 'Wise', requiresConnect: true, status: connected ? 'Unlocked' : 'Requires Connect' },
    {
      name: 'International bank transfer',
      requiresConnect: true,
      status: connected ? 'Unlocked' : 'Requires Connect',
    },
  ];
  return (
    <div className="mt-8 surface-cinematic rounded-3xl p-6">
      <h2 className="font-display text-base font-semibold mb-4">
        Withdrawal rails
      </h2>
      <ul className="divide-y divide-border/40">
        {rails.map((r) => {
          const unlocked = !r.requiresConnect || connected;
          return (
            <li
              key={r.name}
              className="flex items-center justify-between py-3"
            >
              <span className="text-[13px] font-semibold">{r.name}</span>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider ${
                  unlocked
                    ? 'text-[hsl(var(--success))]'
                    : 'text-muted-foreground'
                }`}
              >
                {unlocked ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {r.status}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
