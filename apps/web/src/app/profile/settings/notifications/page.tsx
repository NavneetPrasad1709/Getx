'use client';

import * as React from 'react';
import { Mail, Smartphone, Bell, Megaphone } from 'lucide-react';
import { Skeleton, toast } from '@getx/ui';
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  type NotificationPrefs,
} from '@/hooks/use-account';

type Channel = keyof NotificationPrefs;

const CHANNELS: Array<{
  key: Channel;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'emailNotifications',
    label: 'Email',
    description: 'Order updates · disputes · saved-search matches',
    icon: Mail,
  },
  {
    key: 'pushNotifications',
    label: 'Push notifications',
    description: 'Realtime in-app + mobile delivery',
    icon: Bell,
  },
  {
    key: 'smsNotifications',
    label: 'SMS',
    description: 'High-priority alerts only · India numbers',
    icon: Smartphone,
  },
  {
    key: 'marketingOptIn',
    label: 'Marketing + promos',
    description: 'New game launches, drops, referral bonuses',
    icon: Megaphone,
  },
];

export default function NotificationsPage() {
  const { data, isLoading } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  const onToggle = async (key: Channel, value: boolean) => {
    try {
      await update.mutateAsync({ [key]: value } as Partial<NotificationPrefs>);
      toast.success('Preferences updated');
    } catch {
      toast.error('Could not update preferences');
    }
  };

  return (
    <div>
      <p className="text-[14px] text-muted-foreground mb-6 max-w-xl">
        Choose how we reach you. Transactional emails about live orders may
        still be sent for security and fraud-prevention even with email off.
      </p>

      {isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {CHANNELS.map((c) => (
            <li
              key={c.key}
              className="rounded-2xl border border-border/60 bg-surface/60 p-5 flex items-center gap-4"
            >
              <span className="h-10 w-10 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] grid place-items-center shrink-0">
                <c.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[14px] font-extrabold">
                  {c.label}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  {c.description}
                </div>
              </div>
              <Toggle
                checked={data[c.key]}
                onChange={(v) => onToggle(c.key, v)}
                disabled={update.isPending}
                ariaLabel={c.label}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
        checked
          ? 'bg-[hsl(var(--primary))]'
          : 'bg-[hsl(var(--muted-foreground)/0.3)]'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
