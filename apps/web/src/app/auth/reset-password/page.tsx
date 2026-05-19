'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, FloatingInput, toast } from '@getx/ui';
import { ArrowLeft, ArrowRight, AlertTriangle, Check, Eye, EyeOff, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { AuthLayout } from '@/components/auth/auth-layout';

const Schema = z.object({
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
});

type FormData = z.infer<typeof Schema>;

function PasswordHints({ value }: { value: string }) {
  const rules = [
    { ok: value.length >= 8, label: '8+ characters' },
    { ok: /[A-Z]/.test(value), label: 'Uppercase' },
    { ok: /[a-z]/.test(value), label: 'Lowercase' },
    { ok: /[0-9]/.test(value), label: 'Number' },
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
      {rules.map((r) => (
        <span
          key={r.label}
          className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider ${
            r.ok ? 'text-success' : 'text-muted-foreground'
          }`}
        >
          <Check className={`h-3 w-3 ${r.ok ? 'opacity-100' : 'opacity-30'}`} />
          {r.label}
        </span>
      ))}
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(Schema) });

  const passwordValue = watch('password') ?? '';

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error('Reset link is missing or invalid');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      toast.success('Password reset. Sign in to continue.');
      router.push('/auth/login');
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Reset failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Set new password"
      title={token ? 'Pick a strong password' : 'Link expired'}
      subtitle={
        token
          ? 'Choose something you don\'t use anywhere else.'
          : 'Reset links work for 1 hour. Request a fresh one.'
      }
      footer={
        <span>
          Need help? <Link href="/contact" className="text-primary hover:underline">Talk to support</Link>
        </span>
      }
    >
      {!token ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5 flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-warning/15 border border-warning/30 grid place-items-center">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <div className="text-sm">
              <div className="font-semibold text-foreground">Link missing or expired</div>
              <div className="mt-1 text-muted-foreground">
                For security, password reset links expire after 1 hour.
              </div>
            </div>
          </div>
          <Link href="/auth/forgot-password" className="block">
            <Button size="lg" className="w-full rounded-full h-11">
              Request a fresh link <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <div className="relative">
              <FloatingInput
                {...register('password')}
                label="New password"
                type={showPw ? 'text' : 'password'}
                icon={Lock}
                autoComplete="new-password"
                disabled={loading}
                error={errors.password?.message}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-[26px] h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-3">
              <PasswordHints value={passwordValue} />
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            loadingText="Resetting…"
            size="lg"
            className="w-full rounded-full h-12 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.6)]"
          >
            Reset password
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
