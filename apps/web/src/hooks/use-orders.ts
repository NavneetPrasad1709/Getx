'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

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

export type EscrowStatus = 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'PARTIAL';

export interface OrderDeliveryProof {
  images: string[];
  notes: string | null;
  credentials: {
    username: string;
    password: string;
    extra?: string;
  } | null;
  deliveredAt?: string;
}

export interface OrderUserMini {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  email?: string;
  sellerRating?: number;
  verifiedTier?: string | null;
  rank?:
    | 'ROOKIE'
    | 'RISING'
    | 'TRUSTED'
    | 'PRO'
    | 'ELITE'
    | 'LEGEND'
    | null;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  escrowStatus: EscrowStatus;
  amount: number;
  buyerFee: number;
  buyerTotal: number;
  /* Buyer-wallet credit applied to this order (debited at apply, refunded on
     cancel). Razorpay charges (buyerTotal - walletApplied). */
  walletApplied?: number;
  /* Loyalty points + USD value redeemed at checkout. Cannot co-exist with
     walletApplied — server enforces the mutex. */
  loyaltyPointsApplied?: number;
  loyaltyUsdApplied?: number;
  /* Provider-collected sales tax/VAT/GST. Stripe Tax populates this from
     the buyer's billing address; 0 when no jurisdiction tax applies. */
  taxAmount?: number;
  sellerCommission: number;
  sellerAmount: number;
  currency: string;
  createdAt: string;
  paidAt?: string | null;
  deliveredAt?: string | null;
  confirmedAt?: string | null;
  paymentCapturedAt?: string | null;
  paymentMetadata: { snapshotTitle?: string } | null;
  buyer: { id: string; name: string | null; username: string | null };
  seller: { id: string; name: string | null; username: string | null };
  productListing?: { slug: string | null; images: string[] } | null;
  customRequest?: { requestNumber: string; title: string } | null;
}

export interface DisputeSummary {
  id: string;
  disputeNumber: string;
  reason: string;
  status: 'OPEN' | 'REVIEWING' | 'AWAITING_RESPONSE' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface OrderDetail extends OrderListItem {
  buyer: OrderUserMini;
  seller: OrderUserMini;
  productListing?: {
    id: string;
    slug: string | null;
    sku: string;
    title: string;
    images: string[];
    status?: string;
    deletedAt?: string | null;
  } | null;
  customRequest?: {
    id: string;
    requestNumber: string;
    title: string;
    tabType: string;
  } | null;
  deliveryProof?: OrderDeliveryProof | null;
  paymentTransactionId?: string | null;
  paymentProvider?: string | null;
  autoReleaseAt?: string | null;
  disputes?: DisputeSummary[];
}

export interface CheckoutSessionResponse {
  sessionId: string;
  checkoutUrl: string;
  expiresAt: string;
}

export function useMyOrders(role: 'buyer' | 'seller' | 'all' = 'buyer') {
  return useQuery<OrderListItem[]>({
    queryKey: ['orders', role],
    queryFn: async () => {
      const { data } = await api.get<OrderListItem[]>(`/orders/me/list?role=${role}`);
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useOrder(id: string) {
  return useQuery<OrderDetail>({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/orders/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === 'PENDING' ? 3000 : false;
    },
  });
}

export function useCreateOrderFromListing() {
  const qc = useQueryClient();
  return useMutation<
    OrderDetail,
    Error,
    { listingId: string; quantity?: number; variantId?: string }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<OrderDetail>('/orders/from-listing', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useCreateOrderFromOffer() {
  const qc = useQueryClient();
  return useMutation<OrderDetail, Error, { offerId: string }>({
    mutationFn: async (payload) => {
      const { data } = await api.post<OrderDetail>('/orders/from-offer', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['custom-requests'] });
    },
  });
}

export function useReorder() {
  const qc = useQueryClient();
  return useMutation<{ orderId: string }, Error, string>({
    mutationFn: async (orderId) => {
      const { data } = await api.post<{ orderId: string }>(
        `/orders/${orderId}/reorder`,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useCreateCheckout() {
  return useMutation<CheckoutSessionResponse, Error, string>({
    mutationFn: async (orderId) => {
      const { data } = await api.post<CheckoutSessionResponse>(`/payments/checkout/${orderId}`);
      return data;
    },
  });
}

export function useConfirmReceipt() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (orderId) => {
      const { data } = await api.patch<{ success: boolean; message: string }>(
        `/orders/${orderId}/confirm-receipt`,
      );
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders', id] });
    },
  });
}
