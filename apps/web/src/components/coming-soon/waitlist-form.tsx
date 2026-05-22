'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Check, Loader2, Gift } from 'lucide-react';
import { toast } from '@getx/ui';
import { api } from '@/lib/api';

interface WaitlistFormProps {
  slug: string;
  gameName: string;
}

type FormState = 'idle' | 'submitting' | 'success';

export function WaitlistForm({ slug, gameName }: WaitlistFormProps) {
  const [email, setEmail] = React.useState('');
  const [state, setState] = React.useState<FormState>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Enter a valid email');
      return;
    }
    setState('submitting');

    try {
      await api.post('/waitlist/game', { email, game: slug });
      setState('success');
      toast.success(`You're on the ${gameName} waitlist!`);
    } catch {
      setState('idle');
      toast.error('Could not join waitlist. Try again.');
    }
  };

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">
        {state === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="
              flex items-center gap-3 rounded-2xl
              bg-success/10 border border-success/30
              p-4
            "
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                You&apos;re on the list.
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                We&apos;ll email you at <span className="font-mono text-foreground/80">{email}</span> the moment {gameName} goes live.
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
            data-slug={slug}
          >
            <div className="relative">
              <Mail
                className="
                  absolute left-4 top-1/2 -translate-y-1/2
                  h-4 w-4 text-muted-foreground
                  pointer-events-none
                "
                aria-hidden
              />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state === 'submitting'}
                aria-label={`Email for ${gameName} waitlist`}
                className="
                  w-full h-12 pl-11 pr-3 rounded-2xl
                  bg-surface text-foreground text-[14.5px]
                  border border-border
                  focus:border-primary focus:ring-4 focus:ring-primary/15
                  outline-none transition-all duration-200
                  placeholder:text-muted-foreground/60
                  disabled:opacity-60
                "
              />
            </div>

            <button
              type="submit"
              disabled={state === 'submitting'}
              className="
                group w-full h-12 inline-flex items-center justify-center gap-2
                rounded-2xl text-[14px] font-semibold tracking-tight
                bg-gradient-to-b from-primary to-primary-hover
                text-primary-foreground
                shadow-[0_6px_18px_-4px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.22),inset_0_-2px_0_hsl(0_0%_0%/0.15)]
                hover:-translate-y-px hover:from-primary-hover hover:to-primary
                active:translate-y-0 active:shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.40)]
                disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0
                transition-all duration-150
              "
            >
              {state === 'submitting' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Notify me on launch
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                </>
              )}
            </button>

            <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Gift className="h-3 w-3 text-primary" />
              <span>
                <span className="text-foreground font-semibold">$5 launch credit</span>
                {' '}lands in your wallet the day {gameName} ships.
              </span>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
