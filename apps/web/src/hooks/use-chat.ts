'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export interface ChatUser {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  content: string;
  attachments: string[];
  readAt: string | null;
  systemEvent: string | null;
  createdAt: string;
  sender: ChatUser;
}

export type ConversationKind = 'ORDER' | 'OFFER' | 'PRE_PURCHASE';

export interface Conversation {
  id: string;
  orderId: string | null;
  offerId: string | null;
  listingId: string | null;
  type: ConversationKind;
  buyerId: string;
  sellerId: string;
  buyer: ChatUser;
  seller: ChatUser;
  order: { id: string; orderNumber: string; status: string } | null;
  offer: {
    id: string;
    request: { id: string; requestNumber: string; title: string };
  } | null;
  listing: { id: string; title: string; slug: string | null; tabType: string } | null;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  buyerUnread: number;
  sellerUnread: number;
  status: 'ACTIVE' | 'CLOSED' | 'BLOCKED' | 'SPAM';
}

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation<Conversation, Error, { orderId?: string; offerId?: string }>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Conversation>('/conversations', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

/* Pre-purchase chat — buyer messages a seller about a listing without
   creating an order. Rate-limit + spam errors come back from the API as
   axios errors with response.data.message; surface to the caller via
   mutation.error so the UI can toast or guide. */
export function useOpenPrePurchaseChat() {
  const qc = useQueryClient();
  return useMutation<Conversation, Error, { listingId: string }>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Conversation>(
        '/conversations/pre-purchase',
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useMyConversations(enabled = true) {
  return useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get<Conversation[]>('/conversations/me/list');
      return data;
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useConversation(id: string | null) {
  return useQuery<Conversation>({
    queryKey: ['conversations', id],
    queryFn: async () => {
      const { data } = await api.get<Conversation>(`/conversations/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data } = await api.get<ChatMessage[]>(`/conversations/${conversationId}/messages`);
      return data;
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation<ChatMessage, Error, { content: string; attachments?: string[] }>({
    mutationFn: async (payload) => {
      const { data } = await api.post<ChatMessage>(
        `/conversations/${conversationId}/messages`,
        payload,
      );
      return data;
    },
    onSuccess: (msg) => {
      qc.setQueryData<ChatMessage[]>(['messages', conversationId], (old = []) => {
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (conversationId) => {
      await api.patch(`/conversations/${conversationId}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

interface TypingPayload {
  userId: string;
  isTyping: boolean;
}

interface ReadPayload {
  userId: string;
  conversationId: string;
}

export function useRealtimeChat(conversationId: string | null) {
  const qc = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!conversationId) return;

    // Snapshot the ref at effect setup so the cleanup uses the same Map.
    const timers = typingTimers.current;
    const socket = getSocket();
    socket.emit('join_conversation', { conversationId });

    const onMessage = (msg: ChatMessage) => {
      if (msg.conversationId !== conversationId) return;
      qc.setQueryData<ChatMessage[]>(['messages', conversationId], (old = []) => {
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    };

    const onTyping = (data: TypingPayload) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.userId);
          const existing = timers.get(data.userId);
          if (existing) clearTimeout(existing);
          timers.set(
            data.userId,
            setTimeout(() => {
              setTypingUsers((p) => {
                const n = new Set(p);
                n.delete(data.userId);
                return n;
              });
            }, 3000),
          );
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    };

    const onRead = (data: ReadPayload) => {
      if (data.conversationId !== conversationId) return;
      qc.setQueryData<ChatMessage[]>(['messages', conversationId], (old = []) =>
        old.map((m) =>
          m.senderId !== data.userId && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
        ),
      );
    };

    socket.on('message_received', onMessage);
    socket.on('user_typing', onTyping);
    socket.on('messages_read', onRead);

    return () => {
      socket.emit('leave_conversation', { conversationId });
      socket.off('message_received', onMessage);
      socket.off('user_typing', onTyping);
      socket.off('messages_read', onRead);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [conversationId, qc]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      const socket = getSocket();
      socket.emit('typing', { conversationId, isTyping });
    },
    [conversationId],
  );

  return { typingUsers, sendTyping };
}
