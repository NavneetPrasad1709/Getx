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

export interface SellerOrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  escrowStatus: EscrowStatus;
  amount: number;
  buyerFee: number;
  buyerTotal: number;
  sellerCommission: number;
  sellerAmount: number;
  currency: string;
  createdAt: string;
  paymentCapturedAt?: string | null;
  deliveredAt?: string | null;
  confirmedAt?: string | null;
  paymentMetadata: { snapshotTitle?: string } | null;
  buyer: { id: string; name: string | null; username: string | null };
  seller: { id: string; name: string | null; username: string | null };
  productListing?: { slug: string | null; images: string[] } | null;
  customRequest?: { requestNumber: string; title: string } | null;
}

export interface SellerOrderDetail extends SellerOrderListItem {
  buyer: {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
    email?: string;
  };
  seller: {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
  };
  productListing?: {
    id: string;
    slug: string | null;
    sku: string;
    title: string;
    images: string[];
  } | null;
  customRequest?: {
    id: string;
    requestNumber: string;
    title: string;
    tabType: string;
  } | null;
  deliveryProof?: OrderDeliveryProof | null;
  autoReleaseAt?: string | null;
}

export interface MarkDeliveredPayload {
  proofImages: string[];
  notes?: string;
  credentials?: {
    username: string;
    password: string;
    extra?: string;
  };
}

export function useMySellerOrders() {
  return useQuery<SellerOrderListItem[]>({
    queryKey: ['seller-orders'],
    queryFn: async () => {
      const { data } = await api.get<SellerOrderListItem[]>('/orders/me/list?role=seller');
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useSellerOrder(id: string) {
  return useQuery<SellerOrderDetail>({
    queryKey: ['seller-orders', id],
    queryFn: async () => {
      const { data } = await api.get<SellerOrderDetail>(`/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useMarkDelivered() {
  const qc = useQueryClient();
  return useMutation<SellerOrderDetail, Error, { id: string; payload: MarkDeliveredPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.patch<SellerOrderDetail>(`/orders/${id}/mark-delivered`, payload);
      return data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
      qc.invalidateQueries({ queryKey: ['seller-orders', id] });
    },
  });
}
