'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, FloatingInput, toast } from '@getx/ui';
import { ArrowRight, Check, Eye, EyeOff, Mail, Lock, User, Globe } from 'lucide-react';
import { api } from '@/lib/api';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SocialAuth } from '@/components/auth/social-auth';

const Schema = z.object({
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
  name: z.string().min(2, 'Name required'),
  country: z.string().length(2, 'Select your country'),
  interest: z.enum(['BUYER', 'SELLER', 'BOTH']),
  acceptTerms: z.literal(true, { error: () => 'Required' }),
});

type FormData = z.infer<typeof Schema>;

/* Global pivot — list is sorted alphabetically by label so no single
   country reads as the "default" market. A "Select country" sentinel
   forces an explicit pick instead of silently defaulting (the API
   sanctions/allowlist gate runs on this value, so a wrong default
   produced silent waitlist routes). */
const COUNTRIES = [
  { code: '', label: 'Select country' },
  { code: 'AU', label: 'Australia' },
  { code: 'BR', label: 'Brazil' },
  { code: 'CA', label: 'Canada' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'IN', label: 'India' },
  { code: 'JP', label: 'Japan' },
  { code: 'MX', label: 'Mexico' },
  { code: 'PH', label: 'Philippines' },
  { code: 'SG', label: 'Singapore' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
];

function PasswordStrength({ value }: { value: string }) {
  const rules = [
    { ok: value.length >= 8, label: '8+ characters' },
    { ok: /[A-Z]/.test(value), label: 'Uppercase' },
    { ok: /[a-z]/.test(value), label: 'Lowercase' },
    { ok: /[0-9]/.test(value), label: 'Number' },
  ];
  const passed = rules.filter((r) => r.ok).length;
  const tone =
    passed === 0
      ? 'bg-muted/40'
      : passed === 1
        ? 'bg-error'
        : passed === 2
          ? 'bg-warning'
          : passed === 3
            ? 'bg-primary'
            : 'bg-success';
  const label =
    value.length === 0
      ? 'Set a password'
      : passed <= 1
        ? 'Weak'
        : passed === 2
          ? 'Fair'
          : passed === 3
            ? 'Strong'
            : 'Excellent';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={`h-full ${tone} transition-all duration-ui ease-apple`}
            style={{ width: `${(passed / 4) * 100}%` }}
          />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
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
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { country: '', interest: 'BUYER' },
    mode: 'onBlur',
  });

  const interestValue = watch('interest') ?? 'BUYER';

  const passwordValue = watch('password') ?? '';
  const emailValue = watch('email') ?? '';
  const nameValue = watch('name') ?? '';

  const emailValid =
    !errors.email && dirtyFields.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const nameValid = !errors.name && dirtyFields.name && nameValue.trim().length >= 2;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/auth/register', data);
      toast.success('Account created. Check your email.');
      router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="New player · 60s"
      title="Create your account"
      subtitle="No credit card. No SMS gymnastics. Just trade."
      footer={
        <span>
          Need help? <Link href="/contact" className="text-primary hover:underline">Talk to support</Link>
        </span>
      }
    >
      <SocialAuth />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <FloatingInput
          {...register('name')}
          label="Display name"
          icon={User}
          autoComplete="name"
          disabled={loading}
          error={errors.name?.message}
          success={nameValid}
          required
        />

        <FloatingInput
          {...register('email')}
          label="Email"
          type="email"
          icon={Mail}
          autoComplete="email"
          disabled={loading}
          error={errors.email?.message}
          success={emailValid}
          required
        />

        <div>
          <div className="relative">
            <FloatingInput
              {...register('password')}
              label="Password"
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
            <PasswordStrength value={passwordValue} />
          </div>
        </div>

        <div>
          <label htmlFor="country" className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2">
            <Globe className="inline h-3 w-3 mr-1" />
            Country
          </label>
          <select
            {...register('country')}
            id="country"
            disabled={loading}
            className="w-full h-12 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors hover:border-primary/50"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code || 'none'} value={c.code} disabled={c.code === ''}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.country ? (
            <p className="text-error text-xs mt-1.5">{errors.country.message}</p>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2">
            I&apos;m here to…
          </label>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Sign-up intent">
            {[
              { value: 'BUYER', label: 'Buy', hint: 'Browse drops' },
              { value: 'SELLER', label: 'Sell', hint: 'Earn from gear' },
              { value: 'BOTH', label: 'Both', hint: 'Trade & earn' },
            ].map((opt) => {
              const selected = interestValue === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`relative flex flex-col items-start justify-center h-[68px] px-3 rounded-xl border cursor-pointer transition-all ${
                    selected
                      ? 'border-primary bg-primary/8 shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]'
                      : 'border-border bg-surface/40 hover:border-primary/40'
                  }`}
                >
                  <input
                    {...register('interest')}
                    type="radio"
                    value={opt.value}
                    disabled={loading}
                    className="sr-only"
                    aria-checked={selected}
                  />
                  <span className={`text-[13px] font-bold ${selected ? 'text-primary' : 'text-foreground'}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground">
                    {opt.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-sm select-none">
          <input
            {...register('acceptTerms')}
            type="checkbox"
            disabled={loading}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-foreground/80 leading-snug">
            I agree to the{' '}
            <Link href="/terms" className="text-primary hover:underline">Terms</Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy policy</Link>.
          </span>
        </label>
        {errors.acceptTerms ? (
          <p className="text-error text-xs -mt-2">{errors.acceptTerms.message}</p>
        ) : null}

        <Button
          type="submit"
          loading={loading}
          loadingText="Creating account…"
          size="lg"
          className="w-full rounded-full h-12 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.6)]"
        >
          Create my account
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
