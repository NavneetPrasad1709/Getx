'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, toast } from '@getx/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

const Schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof Schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const errorParam = params.get('error');
  const { refetch } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (errorParam === 'admin_required') {
      toast.error('Admin role required');
    }
  }, [errorParam]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(Schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { ...data, rememberMe: true });
      // FLOW-011: verify admin role BEFORE navigating. A non-admin who logs in
      // here would otherwise be pushed into the console and bounced straight
      // back out by the middleware — an infinite redirect loop. The login
      // response carries the role, so check it directly.
      const role = (res.data as { user?: { role?: string } })?.user?.role;
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        await api.post('/auth/logout').catch(() => {});
        toast.error('This account does not have admin access.');
        setLoading(false);
        return;
      }
      await refetch();
      toast.success('Welcome, admin');
      // Same-origin paths only — never honour an absolute/protocol-relative next.
      const dest = next.startsWith('/') && !next.startsWith('//') ? next : '/';
      router.push(dest);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
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
          <CardTitle className="font-display text-3xl text-center">GETX Admin</CardTitle>
          <p className="text-center text-muted-foreground text-sm">Internal operations console</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <Input
                {...register('email')}
                type="email"
                placeholder="admin@getx.live"
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
                disabled={loading}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-error text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Signing in…' : 'Login'}
            </Button>
          </form>
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
