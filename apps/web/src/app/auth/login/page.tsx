'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, toast } from '@getx/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

const Schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  rememberMe: z.boolean(),
});

type FormData = z.infer<typeof Schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const { refetch } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/auth/login', data);
      await refetch();
      toast.success('Welcome back!');
      router.push(next);
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-3xl text-center">Welcome back</CardTitle>
          <p className="text-center text-muted-foreground">Login to GETX</p>
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
                autoComplete="email"
              />
              {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Password</label>
              <Input
                {...register('password')}
                type="password"
                placeholder="Your password"
                disabled={loading}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-error text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm flex items-center gap-2">
                <input {...register('rememberMe')} type="checkbox" disabled={loading} />
                Remember me
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-primary">
                Forgot?
              </Link>
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Signing in...' : 'Login'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            New to GETX?{' '}
            <Link href="/auth/register" className="text-primary font-medium">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
