'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { Button, Card, toast } from '@getx/ui';
import { ChatWindow } from './chat-window';
import { useStartConversation } from '@/hooks/use-chat';

interface Props {
  orderId?: string;
  offerId?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

export function ChatButton({
  orderId,
  offerId,
  label = 'Open chat',
  variant = 'default',
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const startConv = useStartConversation();

  const handleOpen = async () => {
    if (conversationId) {
      setOpen(true);
      return;
    }
    try {
      const conv = await startConv.mutateAsync({ orderId, offerId });
      setConversationId(conv.id);
      setOpen(true);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Failed to open chat');
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={startConv.isPending}
        variant={variant}
        className={className}
      >
        {startConv.isPending ? 'Opening…' : label}
      </Button>

      {open && conversationId && (
        <div className="fixed bottom-4 right-4 z-40 w-[380px] max-w-[95vw] shadow-2xl">
          <Card className="overflow-hidden border-border">
            <div className="flex justify-between items-center p-2 border-b bg-card">
              <span className="text-sm font-medium px-2">Chat</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 leading-none text-xl"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
            <ChatWindow conversationId={conversationId} />
          </Card>
        </div>
      )}
    </>
  );
}
