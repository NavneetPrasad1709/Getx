import {
  ShoppingBag,
  Wallet,
  Truck,
  CheckCircle2,
  XCircle,
  Tag,
  ThumbsUp,
  ThumbsDown,
  Clock,
  MessageCircle,
  Star,
  MessageSquareQuote,
  CreditCard,
  AlertTriangle,
  Banknote,
  Bell,
  type LucideProps,
} from 'lucide-react';
import type { NotificationType } from '@/hooks/use-notifications';

/* Notification icon + tone registry. Single source of truth so the bell
   dropdown, the full list page, and any future toast/push surface render
   the same visual language for a given event type. */

interface IconConfig {
  icon: React.ComponentType<LucideProps>;
  tone: string;
  bg: string;
}

const REGISTRY: Record<NotificationType, IconConfig> = {
  ORDER_CREATED: { icon: ShoppingBag, tone: 'text-primary', bg: 'bg-primary/15' },
  ORDER_PAID: { icon: Wallet, tone: 'text-primary', bg: 'bg-primary/15' },
  ORDER_IN_PROGRESS: { icon: Clock, tone: 'text-primary', bg: 'bg-primary/15' },
  ORDER_DELIVERED: { icon: Truck, tone: 'text-success', bg: 'bg-success/15' },
  ORDER_CONFIRMED: { icon: CheckCircle2, tone: 'text-success', bg: 'bg-success/15' },
  ORDER_COMPLETED: { icon: CheckCircle2, tone: 'text-success', bg: 'bg-success/15' },
  ORDER_CANCELLED: { icon: XCircle, tone: 'text-muted-foreground', bg: 'bg-muted/15' },
  OFFER_RECEIVED: { icon: Tag, tone: 'text-accent', bg: 'bg-accent/15' },
  OFFER_ACCEPTED: { icon: ThumbsUp, tone: 'text-success', bg: 'bg-success/15' },
  OFFER_REJECTED: { icon: ThumbsDown, tone: 'text-hot', bg: 'bg-hot/15' },
  OFFER_EXPIRED: { icon: Clock, tone: 'text-muted-foreground', bg: 'bg-muted/15' },
  NEW_MESSAGE: { icon: MessageCircle, tone: 'text-primary', bg: 'bg-primary/15' },
  NEW_REVIEW: { icon: Star, tone: 'text-accent', bg: 'bg-accent/15' },
  REVIEW_RESPONSE: { icon: MessageSquareQuote, tone: 'text-accent', bg: 'bg-accent/15' },
  PAYMENT_SUCCESS: { icon: CreditCard, tone: 'text-success', bg: 'bg-success/15' },
  PAYMENT_FAILED: { icon: AlertTriangle, tone: 'text-error', bg: 'bg-error/15' },
  WITHDRAWAL_REQUESTED: { icon: Banknote, tone: 'text-primary', bg: 'bg-primary/15' },
  WITHDRAWAL_APPROVED: { icon: Banknote, tone: 'text-success', bg: 'bg-success/15' },
  WITHDRAWAL_PROCESSED: { icon: Banknote, tone: 'text-success', bg: 'bg-success/15' },
  SYSTEM_ALERT: { icon: Bell, tone: 'text-accent', bg: 'bg-accent/15' },
};

/* Coarse grouping — for the future tab/filter UI on /profile/notifications. */
export type NotificationGroup = 'orders' | 'offers' | 'messages' | 'reviews' | 'payouts' | 'system';

const GROUP_BY_TYPE: Record<NotificationType, NotificationGroup> = {
  ORDER_CREATED: 'orders',
  ORDER_PAID: 'orders',
  ORDER_IN_PROGRESS: 'orders',
  ORDER_DELIVERED: 'orders',
  ORDER_CONFIRMED: 'orders',
  ORDER_COMPLETED: 'orders',
  ORDER_CANCELLED: 'orders',
  OFFER_RECEIVED: 'offers',
  OFFER_ACCEPTED: 'offers',
  OFFER_REJECTED: 'offers',
  OFFER_EXPIRED: 'offers',
  NEW_MESSAGE: 'messages',
  NEW_REVIEW: 'reviews',
  REVIEW_RESPONSE: 'reviews',
  PAYMENT_SUCCESS: 'payouts',
  PAYMENT_FAILED: 'payouts',
  WITHDRAWAL_REQUESTED: 'payouts',
  WITHDRAWAL_APPROVED: 'payouts',
  WITHDRAWAL_PROCESSED: 'payouts',
  SYSTEM_ALERT: 'system',
};

export function getNotificationIcon(type: NotificationType): IconConfig {
  return REGISTRY[type] ?? { icon: Bell, tone: 'text-primary', bg: 'bg-primary/15' };
}

export function getNotificationGroup(type: NotificationType): NotificationGroup {
  return GROUP_BY_TYPE[type] ?? 'system';
}

interface NotificationIconProps {
  type: NotificationType;
  size?: 'sm' | 'md';
  className?: string;
}

export function NotificationIcon({ type, size = 'md', className = '' }: NotificationIconProps) {
  const cfg = getNotificationIcon(type);
  const Icon = cfg.icon;
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const inner = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${dim} ${cfg.bg} ${cfg.tone} ${className}`}
    >
      <Icon className={inner} />
    </span>
  );
}
