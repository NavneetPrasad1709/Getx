'use client';

import * as React from 'react';
import { AxiosError } from 'axios';
import { BadgeCheck, ShieldAlert, AlertCircle, Globe } from 'lucide-react';
import { Button, toast } from '@getx/ui';
import { useKycStatus } from '@/hooks/use-account';

/* KYC settings — Sumsub is the single global identity-verification
   flow. Every user (India included) goes through the same WebSDK
   widget; Sumsub picks the right document set based on the issuing
   country it detects from the upload. The previous Aadhaar-only form
   has been retired with the global pivot. */
export default function KycPage() {
  const { data } = useKycStatus();
  return <SumsubFlow status={data?.status ?? 'NONE'} />;
}

function SumsubFlow({ status }: { status: string }) {
  const [loading, setLoading] = React.useState(false);
  const [tokenInfo, setTokenInfo] = React.useState<{ token: string; mock: boolean } | null>(null);

  const startKyc = async () => {
    setLoading(true);
    try {
      const { api } = await import('@/lib/api');
      const { data } = await api.get<{ token: string; userId: string; mock: boolean }>(
        '/account/kyc/sumsub-token',
      );
      setTokenInfo({ token: data.token, mock: data.mock });
      toast.success(
        data.mock
          ? 'Mock Sumsub token issued · embed widget ships next sprint'
          : 'Sumsub session created · widget loading…',
      );
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not start KYC');
    } finally {
      setLoading(false);
    }
  };

  const statusTone =
    status === 'VERIFIED'
      ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
      : status === 'SUBMITTED' || status === 'PENDING'
        ? 'bg-[hsl(28_92%_55%/0.15)] text-[hsl(28_92%_55%)]'
        : status === 'REJECTED'
          ? 'bg-[hsl(var(--error)/0.15)] text-[hsl(var(--error))]'
          : 'bg-[hsl(var(--muted-foreground)/0.15)] text-muted-foreground';

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-surface/60 p-6 md:p-8">
        <div className="flex items-start gap-4 mb-4">
          <span className="h-10 w-10 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] grid place-items-center shrink-0">
            <Globe className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-extrabold inline-flex items-center gap-2">
              KYC verification
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusTone}`}>
                {status === 'NONE' ? 'Not submitted' : status.toLowerCase()}
              </span>
            </h2>
            <p className="text-[12.5px] text-muted-foreground mt-1 max-w-md">
              We use Sumsub for global identity verification — ID document,
              live selfie, and AML/sanctions screening. Documents accepted
              from any issuing country. Median pass time is under 6 hours.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-surface/60 p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <BadgeCheck className="h-4 w-4 text-[hsl(var(--primary))]" />
          <h3 className="font-display text-[15px] font-extrabold">What you&apos;ll need</h3>
        </div>
        <ul className="space-y-2 text-[13px] text-foreground/85">
          <li>• Government-issued photo ID (passport, driver&apos;s licence, national ID — any country)</li>
          <li>• A device with a working camera for the live selfie</li>
          <li>• 2-3 minutes</li>
        </ul>

        <div className="rounded-xl bg-[hsl(var(--surface-elevated))] p-3 flex items-start gap-2 text-[11.5px] text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
          <span>
            Documents stay encrypted at Sumsub. GETX only stores the
            verification result + applicant ID — never your raw documents.
          </span>
        </div>

        <Button
          onClick={startKyc}
          loading={loading}
          loadingText="Starting…"
          className="rounded-full"
          disabled={status === 'VERIFIED'}
        >
          {status === 'VERIFIED' ? 'Verified · no action needed' : 'Start verification'}
        </Button>

        {tokenInfo?.mock ? (
          <div className="rounded-xl bg-[hsl(28_92%_55%/0.08)] border border-[hsl(28_92%_55%/0.3)] p-3 text-[11.5px] text-[hsl(28_92%_55%)] flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Dev mode: SUMSUB_APP_TOKEN missing on the API. Mock token
              returned for testing. The real WebSDK widget renders when
              that env var is set.
            </span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
