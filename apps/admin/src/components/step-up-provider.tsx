'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ShieldCheck, X, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@getx/ui';
import { api } from '@/lib/api';
import { setStepUpRequester } from '@/lib/step-up';
import { extractMessage } from '@/lib/api-error';

/* AUTH-008 — re-auth modal driven by the axios interceptor. When a CRITICAL
   admin action returns 403 step_up_required, requestStepUpToken() resolves to
   the requester registered here: it opens this modal, asks for the right
   factor (TOTP if 2FA is on, else password), exchanges it at /auth/step-up for
   a 5-minute token, and resolves so the original request can be replayed. */

type Mode = 'loading' | 'totp' | 'password';
type Resolver = { resolve: (token: string) => void; reject: (e: Error) => void };

export function StepUpProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('loading');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resolverRef = useRef<Resolver | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setValue('');
    setError(null);
    setSubmitting(false);
    resolverRef.current = null;
  }, []);

  const requester = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      if (resolverRef.current) {
        reject(new Error('Another verification is already in progress.'));
        return;
      }
      resolverRef.current = { resolve, reject };
      setValue('');
      setError(null);
      setSubmitting(false);
      setMode('loading');
      setOpen(true);
      // Decide which factor to ask for.
      api
        .get('/auth/2fa/status')
        .then(({ data }) =>
          setMode((data as { enabled: boolean }).enabled ? 'totp' : 'password'),
        )
        .catch(() => setMode('password'));
    });
  }, []);

  useEffect(() => {
    setStepUpRequester(requester);
    return () => setStepUpRequester(null);
  }, [requester]);

  const cancel = useCallback(() => {
    resolverRef.current?.reject(new Error('Step-up cancelled'));
    close();
  }, [close]);

  // Escape closes (= cancel).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, cancel]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting || mode === 'loading') return;
      setSubmitting(true);
      setError(null);
      try {
        const body =
          mode === 'totp' ? { totpCode: value.trim() } : { password: value };
        const { data } = await api.post('/auth/step-up', body);
        const token = (data as { stepUpToken: string }).stepUpToken;
        resolverRef.current?.resolve(token);
        close();
      } catch (err) {
        setError(extractMessage(err) ?? 'Verification failed. Try again.');
        setSubmitting(false);
      }
    },
    [mode, value, submitting, close],
  );

  return (
    <>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stepup-title"
        >
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={cancel}
            aria-hidden
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface ring-1 ring-border shadow-2xl p-6">
            <button
              type="button"
              onClick={cancel}
              aria-label="Cancel"
              className="absolute right-4 top-4 grid place-items-center h-8 w-8 rounded-full hover:bg-muted/40 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid place-items-center h-11 w-11 rounded-full bg-error/10 ring-1 ring-error/25 text-error mb-3">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <h2 id="stepup-title" className="font-display font-bold text-[17px]">
              Confirm it&apos;s you
            </h2>
            <p className="text-[13px] text-muted-foreground mt-1 mb-4">
              This is a sensitive action. Re-authenticate to continue.
            </p>

            {mode === 'loading' ? (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking your security
                settings…
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="stepup-input">
                    {mode === 'totp'
                      ? 'Authenticator code'
                      : 'Account password'}
                  </Label>
                  <Input
                    id="stepup-input"
                    type={mode === 'totp' ? 'text' : 'password'}
                    inputMode={mode === 'totp' ? 'numeric' : undefined}
                    autoComplete={
                      mode === 'totp' ? 'one-time-code' : 'current-password'
                    }
                    autoFocus
                    placeholder={mode === 'totp' ? '123456' : '••••••••'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="text-[12.5px] text-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={cancel}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={submitting || value.trim().length === 0}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Confirm'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
