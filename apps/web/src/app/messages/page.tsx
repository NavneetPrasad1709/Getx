'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card, CardContent, Skeleton } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { ChatWindow } from '@/components/chat/chat-window';
import { useMyConversations } from '@/hooks/use-chat';
import { useAuth } from '@/hooks/use-auth';

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const { data: conversations, isLoading } = useMyConversations(isAuthenticated);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?next=/messages');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="container py-8 flex-1">
          <Skeleton className="h-96" />
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="container py-8 flex-1">
        <h1 className="font-display text-3xl font-bold mb-6">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[700px]">
          <Card className="md:col-span-1 overflow-hidden flex flex-col">
            <CardContent className="p-2 overflow-y-auto flex-1">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : !conversations || conversations.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
                  No conversations yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => {
                    const counterparty = user.id === conv.buyerId ? conv.seller : conv.buyer;
                    const unread = user.id === conv.buyerId ? conv.buyerUnread : conv.sellerUnread;
                    const active = selectedId === conv.id;
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => setSelectedId(conv.id)}
                        className={`w-full text-left p-3 rounded-md hover:bg-muted/40 transition-colors ${
                          active ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="font-medium text-sm truncate">
                            {counterparty.username ?? counterparty.name ?? '—'}
                          </span>
                          {unread > 0 && <Badge variant="default">{unread}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {conv.lastMessageText ?? 'No messages yet'}
                        </div>
                        {(conv.order || conv.offer) && (
                          <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                            {conv.order && `Order ${conv.order.orderNumber}`}
                            {conv.offer && `Request ${conv.offer.request.requestNumber}`}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 overflow-hidden">
            <CardContent className="p-0 h-full">
              {selectedId ? (
                <ChatWindow conversationId={selectedId} className="h-full" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Select a conversation to start chatting.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
