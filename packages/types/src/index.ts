// ─────────────────────────────────────────────────────────────────────────────
// @getx/types — canonical domain types shared between the API and all frontend
// apps (web, seller, admin). Every union/enum here is the single source of
// truth. Never copy these into individual apps — import from this package.
//
// Rules:
//   • No runtime code — types and interfaces only.
//   • Mirror Prisma enums exactly. Any drift is a bug.
//   • Add new variants here first, then update the Prisma schema migration.
// ─────────────────────────────────────────────────────────────────────────────

// ── Users ────────────────────────────────────────────────────────────────────

export type UserRole = 'BUYER' | 'SELLER' | 'BOTH' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';

export type UserRank =
  | 'ROOKIE'
  | 'RISING'
  | 'TRUSTED'
  | 'PRO'
  | 'ELITE'
  | 'LEGEND';

export type VerifiedTier = 'BASIC' | 'VERIFIED' | 'PREMIUM' | 'ELITE';

// SAP-HIGH-027: matches Prisma KycStatus enum exactly — seller app was using
// 'APPROVED' and 'IN_REVIEW' which diverged from the real enum values.
export type KycStatus =
  | 'NONE'
  | 'PENDING'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

export type KycLevel = 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

export type KycProvider = 'SUMSUB' | 'DIGIO' | 'MANUAL';

export type DocumentType =
  | 'AADHAAR_CARD'
  | 'PAN_CARD'
  | 'PASSPORT'
  | 'DRIVERS_LICENSE'
  | 'NATIONAL_ID'
  | 'RESIDENCE_PERMIT'
  | 'VOTER_ID';

// ── Games & Listings ──────────────────────────────────────────────────────────

export type TabType = 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS' | 'BOOSTING';

export type ProductType =
  | 'POKECOINS'
  | 'ITEMS_BUNDLE'
  | 'ACCOUNT'
  | 'SERVICE'
  | 'TOP_UP'
  | 'OTHER';

export type DeliveryType = 'INSTANT' | 'MANUAL' | 'SERVICE';

export type Platform = 'IOS' | 'ANDROID' | 'PC' | 'WEB';

// SAP-CRIT-011: PENDING_REVIEW + REJECTED included — seller must see why their
// listing disappeared rather than it silently vanishing.
export type ListingStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'SOLD_OUT'
  | 'REMOVED'
  | 'REJECTED';

// ── Custom Requests ───────────────────────────────────────────────────────────

export type RequestStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'AWAITING_CHOICE'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED';

// ── Offers ────────────────────────────────────────────────────────────────────

export type OfferStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED';

// ── Orders & Escrow ───────────────────────────────────────────────────────────

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

export type EscrowStatus =
  | 'PENDING'
  | 'HELD'
  | 'RELEASED'
  | 'REFUNDED'
  | 'PARTIAL';

export type PaymentProvider = 'STRIPE';

export type OrderPaymentMethod =
  | 'CARD'
  | 'UPI'
  | 'PAYPAL'
  | 'CRYPTO'
  | 'WALLET';

// ── Payments & Withdrawals ────────────────────────────────────────────────────

export type WithdrawalMethod =
  | 'UPI'
  | 'BANK_TRANSFER_IN'
  | 'BANK_TRANSFER_INTL'
  | 'PAYPAL'
  | 'WISE'
  | 'CRYPTO_USDT'
  | 'CRYPTO_USDC';

export type WithdrawalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED';

export type FxProvider = 'WISE' | 'RAZORPAYX' | 'MANUAL';

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// ── Wallet ────────────────────────────────────────────────────────────────────

export type TxnType =
  | 'ORDER_RELEASED'
  | 'WITHDRAWAL'
  | 'WITHDRAWAL_FEE'
  | 'REFUND'
  | 'CHARGEBACK'
  | 'BONUS'
  | 'ADJUSTMENT'
  | 'REFERRAL'
  | 'CASHBACK'
  | 'SPEND';

// ── Loyalty ───────────────────────────────────────────────────────────────────

export type LoyaltyTxnType =
  | 'EARNED_PURCHASE'
  | 'EARNED_REFERRAL'
  | 'EARNED_REVIEW'
  | 'EARNED_TIER_BONUS'
  | 'EARNED_FIRST_LISTING'
  | 'EARNED_PROFILE_COMPLETE'
  | 'REDEEMED_AT_CHECKOUT'
  | 'EXPIRED'
  | 'ADJUSTMENT';

// ── Disputes ──────────────────────────────────────────────────────────────────

export type DisputeStatus =
  | 'OPEN'
  | 'REVIEWING'
  | 'AWAITING_RESPONSE'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'CLOSED';

export type DisputeReason =
  | 'NOT_DELIVERED'
  | 'WRONG_ITEM'
  | 'ACCOUNT_RECOVERED'
  | 'FRAUDULENT'
  | 'CHARGEBACK'
  | 'POOR_QUALITY'
  | 'COMMUNICATION_ISSUE'
  | 'OTHER';

export type DisputeResolution =
  | 'REFUND_BUYER'
  | 'RELEASE_TO_SELLER'
  | 'PARTIAL_REFUND'
  | 'NO_ACTION'
  | 'RETURN_GOODS';

export type DisputePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

// ── Reviews ───────────────────────────────────────────────────────────────────

export type ReviewDirection = 'BUYER_REVIEWS_SELLER' | 'SELLER_REVIEWS_BUYER';

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'ORDER_CREATED'
  | 'ORDER_PAID'
  | 'ORDER_IN_PROGRESS'
  | 'ORDER_DELIVERED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'OFFER_EXPIRED'
  | 'REQUEST_NEW_MATCH'
  | 'REQUEST_EXPIRING'
  | 'REQUEST_NEW_OFFER'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_DISPUTED'
  | 'WITHDRAWAL_REQUESTED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_PROCESSED'
  | 'WITHDRAWAL_FAILED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'KYC_REQUIRED'
  | 'KYC_EXPIRING'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESPONSE'
  | 'DISPUTE_RESOLVED'
  | 'NEW_MESSAGE'
  | 'NEW_REVIEW'
  | 'REVIEW_RESPONSE'
  | 'SYSTEM_ALERT'
  | 'ACCOUNT_SECURITY'
  | 'PROMOTIONAL'
  | 'REFERRAL'
  | 'RANK_PROMOTED';

// ── Conversations ─────────────────────────────────────────────────────────────

export type ConversationType = 'ORDER' | 'OFFER' | 'PRE_PURCHASE';

export type ConversationStatus = 'ACTIVE' | 'CLOSED' | 'BLOCKED' | 'SPAM';

export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM';

// ── Audit ─────────────────────────────────────────────────────────────────────

export type AuditSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type AuditSource = 'WEB' | 'API' | 'ADMIN' | 'SYSTEM';

// ── Referrals ─────────────────────────────────────────────────────────────────

export type ReferralStatus =
  | 'PENDING'
  | 'SIGNED_UP'
  | 'REWARDED'
  | 'EXPIRED';

// ── Currency ──────────────────────────────────────────────────────────────────

export type Currency = 'USD' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'SGD' | 'INR';

// ── Shared API shapes ─────────────────────────────────────────────────────────

/** Standard paginated list wrapper returned by all list endpoints. */
export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Minimal user projection safe to embed in any public response. */
export interface UserMini {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
}

/** Seller projection shown on listing cards and order pages. */
export interface SellerSummary extends UserMini {
  sellerRating: number;
  totalSales: number;
  verifiedTier: VerifiedTier | null;
  rank: UserRank;
  isVerified: boolean;
  country: string;
  lastSeenAt: string | null;
  responseTimeMin: number | null;
}

/** Game projection embedded in listings and custom requests. */
export interface GameSummary {
  slug: string;
  name: string;
  icon: string;
}

// ── Branded identifiers ───────────────────────────────────────────────────────

export type OrderNumber = `ORD-${number}-${string}`;
export type CustomRequestNumber = `CR-${number}-${string}`;
export type WithdrawalNumber = `WD-${number}-${string}`;
export type DisputeNumber = `DSP-${number}-${string}`;
