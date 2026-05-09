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
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
});

type FormData = z.infer<typeof Schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(Schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error('Reset link is missing or invalid');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      toast.success('Password reset! Please login.');
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-3xl text-center">New password</CardTitle>
          <p className="text-center text-muted-foreground">Pick a strong one</p>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-4 text-center">
              <p className="text-error text-sm">This reset link is invalid or missing.</p>
              <Link href="/auth/forgot-password" className="text-primary font-medium block">
                Request a new one
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="text-sm font-medium block mb-1">New password</label>
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="Min 8 chars, mixed case + number"
                  disabled={loading}
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="text-error text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? 'Resetting...' : 'Reset password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
