// User
export type UserRole = 'BUYER' | 'SELLER' | 'BOTH' | 'ADMIN' | 'SUPER_ADMIN';
export type KycStatus = 'NONE' | 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';

// Game
export interface GameConfig {
  slug: string;
  name: string;
  icon: string;
  isActive: boolean;
}

// Tabs
export type TabType = 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS' | 'BOOSTING';
export type ListingType = 'BROWSE' | 'REVERSE';

// Order lifecycle
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'REFUNDED';

// Custom request
export type CustomRequestStatus =
  | 'OPEN'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

// Currency
export type Currency = 'USD' | 'INR';

// Identifiers (branded for clarity)
export type OrderNumber = `GTX-${number}-${string}`;
export type CustomRequestNumber = `CR-${number}-${string}`;
