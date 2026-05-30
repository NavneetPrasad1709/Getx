'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import { Button, Input, Label, toast } from '@getx/ui';
import { AdminShell } from '@/components/admin-shell';
import {
  use2FAStatus,
  useSetup2FA,
  useEnable2FA,
  useDisable2FA,
  type TwoFactorSetup,
} from '@/hooks/use-2fa';
import { extractMessage } from '@/lib/api-error';

export default function SecurityPage() {
  const status = use2FAStatus();
  const setup = useSetup2FA();
  const enable = useEnable2FA();
  const disable = useDisable2FA();

  const [pending, setPending] = useState<TwoFactorSetup | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [copied, setCopied] = useState(false);

  const startSetup = async () => {
    try {
      const res = await setup.mutateAsync();
      setPending(res);
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Could not start 2FA setup.');
    }
  };

  const confirmEnable = async () => {
    try {
      await enable.mutateAsync(enableCode.trim());
      toast.success('Two-factor authentication enabled.');
      setPending(null);
      setEnableCode('');
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Invalid code. Try again.');
    }
  };

  const confirmDisable = async () => {
    try {
      await disable.mutateAsync(disableCode.trim());
      toast.success('Two-factor authentication disabled.');
      setDisableCode('');
    } catch (err) {
      toast.error(extractMessage(err) ?? 'Invalid code. Try again.');
    }
  };

  const copySecret = async () => {
    if (!pending) return;
    try {
      await navigator.clipboard.writeText(pending.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed — select the key manually.');
    }
  };

  const enabled = status.data?.enabled ?? false;

  return (
    <AdminShell>
      <div className="max-w-2xl mx-auto px-5 py-8 md:py-10">
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-[24px] tracking-tight">
            Security
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            Protect your admin account and the CRITICAL actions it can perform.
          </p>
        </div>

        <section className="rounded-2xl bg-surface ring-1 ring-border p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div
              className={`grid place-items-center h-10 w-10 rounded-full ring-1 shrink-0 ${
                enabled
                  ? 'bg-success/10 ring-success/25 text-success'
                  : 'bg-error/10 ring-error/25 text-error'
              }`}
            >
              {enabled ? (
                <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
              ) : (
                <ShieldAlert className="h-5 w-5" strokeWidth={2.25} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[15px]">
                Two-factor authentication (TOTP)
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {status.isLoading
                  ? 'Checking status…'
                  : enabled
                    ? 'Enabled. CRITICAL actions (refunds, payouts, bans, dispute resolution) will ask for a code.'
                    : 'Not enabled. CRITICAL actions currently fall back to password re-entry.'}
              </p>
            </div>
            {!status.isLoading && (
              <span
                className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full ${
                  enabled
                    ? 'bg-success/10 text-success'
                    : 'bg-error/10 text-error'
                }`}
              >
                {enabled ? 'On' : 'Off'}
              </span>
            )}
          </div>

          {/* ── Disabled → enrollment flow ── */}
          {!status.isLoading && !enabled && (
            <div className="mt-5 border-t border-border pt-5">
              {!pending ? (
                <Button onClick={startSetup} disabled={setup.isPending}>
                  {setup.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 mr-1.5" /> Set up authenticator
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <ol className="text-[13px] text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>
                      Open your authenticator app (Google Authenticator, Authy,
                      1Password).
                    </li>
                    <li>
                      Add an account and enter the setup key below (or paste the
                      otpauth link).
                    </li>
                    <li>Enter the 6-digit code it shows to finish.</li>
                  </ol>

                  <div>
                    <Label>Setup key</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 select-all rounded-lg bg-muted/30 ring-1 ring-border px-3 py-2 font-mono text-[13px] tracking-wider break-all">
                        {pending.secret}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copySecret}
                        aria-label="Copy setup key"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <a
                      href={pending.otpauthUrl}
                      className="inline-block mt-2 text-[12px] text-primary hover:underline break-all"
                    >
                      otpauth:// link (tap on mobile)
                    </a>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="enable-code">Verification code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="enable-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        value={enableCode}
                        onChange={(e) => setEnableCode(e.target.value)}
                        className="max-w-[160px]"
                      />
                      <Button
                        onClick={confirmEnable}
                        disabled={enable.isPending || enableCode.trim().length < 6}
                      >
                        {enable.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Enable'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Enabled → disable flow ── */}
          {!status.isLoading && enabled && (
            <div className="mt-5 border-t border-border pt-5 space-y-1.5">
              <Label htmlFor="disable-code">
                Enter a current code to turn 2FA off
              </Label>
              <div className="flex gap-2">
                <Input
                  id="disable-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  className="max-w-[160px]"
                />
                <Button
                  variant="outline"
                  onClick={confirmDisable}
                  disabled={disable.isPending || disableCode.trim().length < 6}
                >
                  {disable.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Disable 2FA'
                  )}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
