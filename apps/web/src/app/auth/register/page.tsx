'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, toast } from '@getx/ui';
import { api } from '@/lib/api';

const Schema = z.object({
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
  name: z.string().min(2, 'Name required'),
  country: z.string().length(2),
  acceptTerms: z.literal(true, { error: () => 'Required' }),
});

type FormData = z.infer<typeof Schema>;

const COUNTRIES = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'JP', label: 'Japan' },
  { code: 'SG', label: 'Singapore' },
  { code: 'PH', label: 'Philippines' },
  { code: 'BR', label: 'Brazil' },
  { code: 'MX', label: 'Mexico' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { country: 'IN' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/auth/register', data);
      toast.success('Account created! Check your email.');
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-3xl text-center">Join GETX</CardTitle>
          <p className="text-center text-muted-foreground">Get X. Get gaming.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <Input {...register('name')} placeholder="Your name" disabled={loading} />
              {errors.name && <p className="text-error text-xs mt-1">{errors.name.message}</p>}
            </div>

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
                placeholder="Min 8 chars, mixed case + number"
                disabled={loading}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-error text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Country</label>
              <select
                {...register('country')}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={loading}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-2">
              <input
                {...register('acceptTerms')}
                type="checkbox"
                className="mt-1"
                disabled={loading}
              />
              <label className="text-sm">
                I agree to{' '}
                <Link href="/terms" className="text-primary underline">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary underline">
                  Privacy
                </Link>
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-error text-xs">{errors.acceptTerms.message}</p>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-medium">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
