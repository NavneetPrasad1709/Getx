'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, FloatingInput, toast } from '@getx/ui';
import { ArrowLeft, ArrowRight, Mail, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { AuthLayout } from '@/components/auth/auth-layout';

const Schema = z.object({ email: z.string().email('Invalid email') });
type FormData = z.infer<typeof Schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(Schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setSent(true);
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not send reset email';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title={sent ? 'Check your inbox' : 'Reset your password'}
      subtitle={
        sent
          ? `We sent a reset link to ${getValues('email')}. It expires in 1 hour.`
          : 'Enter your email — we\'ll send a one-time reset link.'
      }
      footer={
        <span>
          Need help? <Link href="/contact" className="text-primary hover:underline">Talk to support</Link>
        </span>
      }
    >
      {sent ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-success/30 bg-success/5 p-5 flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-success/15 border border-success/30 grid place-items-center">
              <MailCheck className="h-4 w-4 text-success" />
            </div>
            <div className="text-sm">
              <div className="font-semibold text-foreground">Email sent</div>
              <div className="mt-1 text-muted-foreground">
                Open the link from any device. Didn&apos;t get it? Check spam, then try resending below.
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full rounded-full h-11"
            onClick={() => setSent(false)}
          >
            Try a different email
          </Button>

          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      ) : (
        <>
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

            <Button
              type="submit"
              loading={loading}
              loadingText="Sending…"
              size="lg"
              className="w-full rounded-full h-12 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.6)]"
            >
              Send reset link
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <Link
            href="/auth/login"
            className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
