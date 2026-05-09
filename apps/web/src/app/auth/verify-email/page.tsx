'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, toast } from '@getx/ui';
import { api } from '@/lib/api';

const Schema = z.object({
  email: z.string().email(),
  otp: z
    .string()
    .length(6, '6 digits')
    .regex(/^\d{6}$/, 'Numbers only'),
});

type FormData = z.infer<typeof Schema>;

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefilled = params.get('email') || '';
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { email: prefilled },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/auth/verify-email', data);
      toast.success('Email verified! Login to continue.');
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
      toast.success('New code sent. Check your email.');
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-3xl text-center">Verify email</CardTitle>
          <p className="text-center text-muted-foreground">Enter the 6-digit code we sent you</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <Input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                disabled={loading}
              />
              {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Verification code</label>
              <Input
                {...register('otp')}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                disabled={loading}
                autoComplete="one-time-code"
              />
              {errors.otp && <p className="text-error text-xs mt-1">{errors.otp.message}</p>}
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Verifying...' : 'Verify'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={resending}
              className="w-full"
              onClick={onResend}
            >
              {resending ? 'Sending...' : 'Resend code'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already verified?{' '}
            <Link href="/auth/login" className="text-primary font-medium">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
