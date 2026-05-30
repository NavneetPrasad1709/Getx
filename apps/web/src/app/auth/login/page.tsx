'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Button, FloatingInput, toast } from '@getx/ui';
import { ArrowRight, Mail, Lock, Eye, EyeOff, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SocialAuth } from '@/components/auth/social-auth';

/* Cooldown countdown — counts ticks down so a 429 doesn't leave the
   user re-clicking until they're locked further out. Reads the
   server-issued Retry-After header (seconds). */
function useCooldown() {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  return {
    remaining,
    start: (seconds: number) => setRemaining(Math.max(0, Math.floor(seconds))),
  };
}

function readRetryAfter(err: unknown): number | null {
  if (!(err instanceof AxiosError)) return null;
  const header =
    err.response?.headers?.['retry-after'] ??
    err.response?.headers?.['Retry-After'];
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

const Schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  rememberMe: z.boolean(),
});

type FormData = z.infer<typeof Schema>;

/* Whitelisted absolute origins we allow `next` to point to. Built from
   the public app URLs. Anything not matched is collapsed to "/" to
   prevent open-redirect attacks. */
const TRUSTED_NEXT_ORIGINS = new Set(
  [
    process.env.NEXT_PUBLIC_SELLER_URL,
    process.env.NEXT_PUBLIC_ADMIN_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
    .filter((u): u is string => Boolean(u))
    .map((u) => {
      try {
        return new URL(u).origin;
      } catch {
        return '';
      }
    })
    .filter(Boolean),
);

/* Our own apex domains. We trust any HTTPS subdomain of these in
   addition to the explicit whitelist above. Reason: NEXT_PUBLIC_* are
   inlined at *build* time, so if the seller/admin URL env var is absent
   from the web project's build env, TRUSTED_NEXT_ORIGINS comes up empty
   and a post-login redirect to e.g. seller.getx.live silently falls
   back to "/". This suffix check keeps cross-app redirects working
   without depending on those env vars being present at build. */
const TRUSTED_BASE_DOMAINS = ['getx.live'];

function isTrustedOrigin(parsed: URL): boolean {
  if (TRUSTED_NEXT_ORIGINS.has(parsed.origin)) return true;
  const host = parsed.hostname;
  // Dev: allow localhost on any port.
  if (host === 'localhost' || host === '127.0.0.1') return true;
  // Production: only HTTPS subdomains of our own apex domains.
  if (parsed.protocol !== 'https:') return false;
  return TRUSTED_BASE_DOMAINS.some(
    (base) => host === base || host.endsWith(`.${base}`),
  );
}

/* Returns a safe redirect target for the `next` query param.
   - Relative path → returned as-is (router.push handles).
   - Absolute URL with a trusted origin → returned as-is
     (caller uses window.location for cross-origin).
   - Anything else → "/" fallback. */
function safeNext(raw: string | null): { url: string; absolute: boolean } {
  if (!raw) return { url: '/', absolute: false };
  if (raw.startsWith('/') && !raw.startsWith('//')) return { url: raw, absolute: false };
  try {
    const parsed = new URL(raw);
    if (isTrustedOrigin(parsed)) {
      return { url: raw, absolute: true };
    }
  } catch {
    /* not a URL */
  }
  return { url: '/', absolute: false };
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextTarget = safeNext(params.get('next'));
  const next = nextTarget.url;
  const { refetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const cooldown = useCooldown();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { rememberMe: false },
    mode: 'onBlur',
  });

  const emailValue = watch('email') ?? '';
  const emailValid = !errors.email && dirtyFields.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

  /* OAuth failure surfacing — backend redirects to /auth/login?error=
     <code> when the Google/Discord callback rejects (user cancelled,
     no email returned, code-exchange failed). One useEffect on mount
     converts the query param into a toast and strips it from the URL
     so a browser refresh doesn't re-fire the message. */
  useEffect(() => {
    const code = params.get('error');
    if (!code) return;
    const messages: Record<string, string> = {
      oauth_cancelled: 'Sign-in cancelled. Try again or use email.',
      oauth_no_email:
        'We could not read your email from that provider. Use a different sign-in.',
      oauth_failed:
        'Sign-in could not complete. Please try again or use email.',
    };
    toast.error(messages[code] ?? messages.oauth_failed);
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    window.history.replaceState({}, '', url.toString());
  }, [params]);

  const onSubmit = async (data: FormData) => {
    if (cooldown.remaining > 0) return;
    setLoading(true);
    try {
      await api.post('/auth/login', data);
      await refetch();
      toast.success('Welcome back!');
      // Cross-origin targets (e.g. the seller subdomain) need a full
      // navigation; router.push only handles same-origin paths.
      if (nextTarget.absolute) {
        window.location.assign(next);
      } else {
        router.push(next);
      }
    } catch (error) {
      const retryAfter = readRetryAfter(error);
      if (retryAfter !== null) {
        cooldown.start(retryAfter);
        toast.error(
          `Too many attempts. Try again in ${retryAfter}s.`,
        );
      } else {
        const msg =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Login failed';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Welcome back"
      subtitle="Sign in to continue where you left off."
      footer={
        <span>
          Need help? <Link href="/contact" className="text-primary hover:underline">Talk to support</Link>
        </span>
      }
    >
      <SocialAuth next={next} />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
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

        <div className="space-y-1.5">
          <div className="relative">
            <FloatingInput
              {...register('password')}
              label="Password"
              type={showPw ? 'text' : 'password'}
              icon={Lock}
              autoComplete="current-password"
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
          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm select-none">
          <input
            {...register('rememberMe')}
            type="checkbox"
            disabled={loading}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-foreground/80">Keep me signed in for 30 days</span>
        </label>

        <Button
          type="submit"
          loading={loading}
          loadingText="Signing in…"
          size="lg"
          disabled={cooldown.remaining > 0}
          className="w-full rounded-full h-12 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.6)]"
        >
          {cooldown.remaining > 0 ? (
            <>
              <Clock className="h-4 w-4" />
              Try again in {cooldown.remaining}s
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-7 text-center text-sm text-muted-foreground">
        New to GetX?{' '}
        <Link href="/auth/register" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
