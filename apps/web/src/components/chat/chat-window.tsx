'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Input, Skeleton } from '@getx/ui';
import { useAuth } from '@/hooks/use-auth';
import {
  useConversation,
  useMarkRead,
  useMessages,
  useRealtimeChat,
  useSendMessage,
  type ChatMessage,
  type ChatUser,
} from '@/hooks/use-chat';

interface Props {
  conversationId: string;
  className?: string;
}

function shortName(user: ChatUser | null | undefined): string {
  return user?.username ?? user?.name ?? '—';
}

function initial(user: ChatUser | null | undefined): string {
  const src = user?.name ?? user?.username ?? '?';
  return src.charAt(0).toUpperCase();
}

export function ChatWindow({ conversationId, className = '' }: Props) {
  const { user } = useAuth();
  const { data: conv } = useConversation(conversationId);
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const markRead = useMarkRead();
  const { typingUsers, sendTyping } = useRealtimeChat(conversationId);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (conversationId) markRead.mutate(conversationId);
    // Re-mark when conversation changes; markRead instance is stable per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  if (!user) return null;

  const counterparty = conv ? (user.id === conv.buyerId ? conv.seller : conv.buyer) : null;

  const handleInputChange = (value: string) => {
    setInput(value);
    sendTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 1500);
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage.mutate({ content: trimmed });
    setInput('');
    sendTyping(false);
  };

  return (
    <div className={`flex flex-col h-full min-h-[400px] max-h-[600px] ${className}`}>
      {conv && counterparty && (
        <div className="border-b p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            {initial(counterparty)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{shortName(counterparty)}</div>
            <div className="text-xs text-muted-foreground truncate">
              {conv.order && `Order ${conv.order.orderNumber}`}
              {conv.offer && `Request ${conv.offer.request.requestNumber}`}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-12 w-3/4 ml-auto" />
            <Skeleton className="h-12 w-1/2" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user.id} />
          ))
        )}

        {typingUsers.size > 0 && counterparty && (
          <div className="text-xs text-muted-foreground italic px-1">
            {shortName(counterparty)} is typing…
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          autoComplete="off"
        />
        <Button type="submit" disabled={!input.trim() || sendMessage.isPending}>
          Send
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  if (message.type === 'SYSTEM') {
    return (
      <div className="text-center my-2">
        <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full inline-block max-w-[90%]">
          {message.content}
        </span>
      </div>
    );
  }

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 ${
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={`text-[10px] mt-1 flex items-center gap-1 justify-end ${
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}
        >
          <span>{time}</span>
          {isOwn && <span>{message.readAt ? '✓✓' : '✓'}</span>}
        </div>
      </div>
    </div>
  );
}
