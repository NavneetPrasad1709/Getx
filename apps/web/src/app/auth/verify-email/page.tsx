'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, FloatingInput, toast } from '@getx/ui';
import { ArrowLeft, ArrowRight, Mail, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { AuthLayout } from '@/components/auth/auth-layout';

const Schema = z.object({
  email: z.string().email(),
  otp: z
    .string()
    .length(6, '6 digits')
    .regex(/^\d{6}$/, 'Numbers only'),
});

type FormData = z.infer<typeof Schema>;

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  function update(i: number, char: string) {
    const next = digits.slice();
    next[i] = char.slice(-1).replace(/\D/g, '');
    onChange(next.join(''));
    if (next[i] && i < 5) refs.current[i + 1]?.focus();
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (txt.length) {
      e.preventDefault();
      onChange(txt.padEnd(6, '').slice(0, 6));
      const focusAt = Math.min(txt.length, 5);
      refs.current[focusAt]?.focus();
    }
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => update(i, e.target.value)}
          onKeyDown={(e) => onKey(e, i)}
          onPaste={onPaste}
          onFocus={(e) => e.currentTarget.select()}
          className="h-12 w-10 sm:w-12 rounded-xl border border-input bg-background text-center font-mono text-xl font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefilled = params.get('email') || '';
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { email: prefilled, otp: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/auth/verify-email', data);
      toast.success('Email verified. Sign in to continue.');
      router.push('/auth/login');
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Verification failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    const email = getValues('email');
    if (!email) {
      toast.error('Enter your email first');
      return;
    }
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('New code sent. Check your inbox.');
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not resend';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="One last step"
      title="Verify your email"
      subtitle="Enter the 6-digit code we just sent. Codes expire in 10 minutes."
      footer={
        <span>
          Wrong email? <Link href="/auth/register" className="text-primary hover:underline">Start over</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FloatingInput
          {...register('email')}
          label="Email"
          type="email"
          icon={Mail}
          autoComplete="email"
          disabled={loading}
          error={errors.email?.message}
          required
        />

        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
            Verification code
          </div>
          <Controller
            name="otp"
            control={control}
            render={({ field }) => (
              <OtpInput value={field.value} onChange={field.onChange} disabled={loading} />
            )}
          />
          {errors.otp && <p className="text-error text-xs mt-2">{errors.otp.message}</p>}
        </div>

        <Button
          type="submit"
          loading={loading}
          loadingText="Verifying…"
          size="lg"
          className="w-full rounded-full h-12 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.6)]"
        >
          Verify email
          <ArrowRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <button
            type="button"
            onClick={onResend}
            disabled={resending}
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
          >
            <MailCheck className="h-3.5 w-3.5" />
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
