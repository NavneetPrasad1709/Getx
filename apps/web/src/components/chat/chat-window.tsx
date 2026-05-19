'use client';

import * as React from 'react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import { Button, Input, Skeleton, toast } from '@getx/ui';
import { Paperclip, X, RefreshCcw, ImageIcon, Loader2 } from 'lucide-react';
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
import { useUploadImage } from '@/hooks/use-upload';

interface Props {
  conversationId: string;
  className?: string;
}

const MAX_ATTACHMENTS = 4;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'done' | 'error';
  uploadedUrl?: string;
  error?: string;
}

function shortName(user: ChatUser | null | undefined): string {
  return user?.username ?? user?.name ?? '—';
}

function initial(user: ChatUser | null | undefined): string {
  const src = user?.name ?? user?.username ?? '?';
  return src.charAt(0).toUpperCase();
}

let attachmentSeq = 0;
function nextAttachmentId(): string {
  attachmentSeq += 1;
  return `att-${Date.now()}-${attachmentSeq}`;
}

export function ChatWindow({ conversationId, className = '' }: Props) {
  const { user } = useAuth();
  const { data: conv } = useConversation(conversationId);
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const markRead = useMarkRead();
  const { typingUsers, sendTyping } = useRealtimeChat(conversationId);
  const uploadImage = useUploadImage();

  const [input, setInput] = useState('');
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Track drag-enter/leave bubbling — entering child elements would
     otherwise toggle the overlay rapidly. */
  const dragDepth = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (conversationId) markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  /* Revoke blob URLs when the component unmounts or pending changes — keeps
     memory tidy across long chat sessions. */
  useEffect(() => {
    return () => {
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const counterparty = conv ? (user.id === conv.buyerId ? conv.seller : conv.buyer) : null;

  const updatePending = (id: string, patch: Partial<PendingAttachment>) => {
    setPending((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  };

  const uploadOne = async (attachment: PendingAttachment) => {
    try {
      const result = await uploadImage.mutateAsync(attachment.file);
      updatePending(attachment.id, { status: 'done', uploadedUrl: result.url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      updatePending(attachment.id, { status: 'error', error: msg });
    }
  };

  const addFiles = (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    if (files.length === 0) return;

    /* Filter: image-only, size cap. Reject silently with a single toast per
       rejection reason so 10 dropped files don't spawn 10 toasts. */
    const accepted: File[] = [];
    let rejectedNonImage = 0;
    let rejectedTooBig = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        rejectedNonImage += 1;
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejectedTooBig += 1;
        continue;
      }
      accepted.push(file);
    }
    if (rejectedNonImage > 0) toast.error('Only images supported');
    if (rejectedTooBig > 0) toast.error('Images must be 5MB or smaller');

    if (accepted.length === 0) return;

    /* Enforce max-4 against current pending count. */
    const room = MAX_ATTACHMENTS - pending.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_ATTACHMENTS} images per message`);
      return;
    }
    const toAdd = accepted.slice(0, room);
    if (accepted.length > room) {
      toast.error(`Only ${room} more image${room === 1 ? '' : 's'} can be attached`);
    }

    const newAttachments: PendingAttachment[] = toAdd.map((file) => ({
      id: nextAttachmentId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'uploading',
    }));
    setPending((prev) => [...prev, ...newAttachments]);
    newAttachments.forEach((a) => void uploadOne(a));
  };

  const removeAttachment = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const retryAttachment = (id: string) => {
    const target = pending.find((p) => p.id === id);
    if (!target) return;
    updatePending(id, { status: 'uploading', error: undefined });
    void uploadOne({ ...target, status: 'uploading' });
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    /* Reset value so picking the same file twice in a row still fires. */
    e.target.value = '';
  };

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    sendTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 1500);
  };

  const anyUploading = pending.some((p) => p.status === 'uploading');
  const doneUrls = pending
    .filter((p) => p.status === 'done' && p.uploadedUrl)
    .map((p) => p.uploadedUrl as string);
  const canSend =
    !sendMessage.isPending &&
    !anyUploading &&
    (input.trim().length > 0 || doneUrls.length > 0);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const trimmed = input.trim();
    sendMessage.mutate(
      {
        content: trimmed || (doneUrls.length > 0 ? '📎 Attachment' : ''),
        attachments: doneUrls,
      },
      {
        onSuccess: () => {
          /* Clean up previews + drop attachments after successful send. */
          pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
          setPending([]);
          setInput('');
          sendTyping(false);
        },
      },
    );
  };

  return (
    <div
      className={`relative flex flex-col h-full min-h-[400px] max-h-[600px] ${className}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {conv && counterparty && (
        <>
          <div className="border-b p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {initial(counterparty)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{shortName(counterparty)}</div>
              <div className="text-xs text-muted-foreground truncate">
                {conv.order && `Order ${conv.order.orderNumber}`}
                {conv.offer && `Request ${conv.offer.request.requestNumber}`}
                {conv.type === 'PRE_PURCHASE' && conv.listing
                  ? `About: ${conv.listing.title}`
                  : null}
              </div>
            </div>
          </div>
          {conv.type === 'PRE_PURCHASE' ? (
            <div className="px-3 py-2 bg-[hsl(var(--primary)/0.06)] border-b border-[hsl(var(--primary)/0.18)] text-[11.5px] text-[hsl(var(--primary))] font-semibold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
              Pre-purchase inquiry · No order yet
            </div>
          ) : null}
        </>
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
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === user.id}
              onImageClick={setLightboxUrl}
            />
          ))
        )}

        {typingUsers.size > 0 && counterparty && (
          <div className="text-xs text-muted-foreground italic px-1">
            {shortName(counterparty)} is typing…
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending attachments preview row */}
      {pending.length > 0 ? (
        <div className="border-t bg-muted/30 px-3 py-2 flex gap-2 flex-wrap">
          {pending.map((att) => (
            <AttachmentPreview
              key={att.id}
              attachment={att}
              onRemove={() => removeAttachment(att.id)}
              onRetry={() => retryAttachment(att.id)}
            />
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSend} className="border-t p-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach images"
          className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={pending.length >= MAX_ATTACHMENTS}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={
            pending.length > 0 ? 'Add a caption (optional)' : 'Type a message…'
          }
          maxLength={2000}
          autoComplete="off"
          className="flex-1"
        />
        <Button type="submit" disabled={!canSend}>
          {anyUploading ? 'Uploading…' : 'Send'}
        </Button>
      </form>

      {/* Drag-drop overlay */}
      {isDragging ? (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center rounded-inherit bg-[hsl(var(--primary)/0.1)] border-2 border-dashed border-[hsl(var(--primary))]">
          <div className="rounded-2xl bg-[hsl(var(--background))] border border-[hsl(var(--primary)/0.3)] shadow-xl px-6 py-5 flex flex-col items-center gap-2 text-center">
            <ImageIcon className="h-8 w-8 text-[hsl(var(--primary))]" />
            <div className="font-display text-base font-bold text-[hsl(var(--foreground))]">
              Drop to attach
            </div>
            <div className="text-[11px] text-muted-foreground">
              Up to {MAX_ATTACHMENTS} images · 5MB each
            </div>
          </div>
        </div>
      ) : null}

      {/* Lightbox */}
      {lightboxUrl ? (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      ) : null}
    </div>
  );
}

function AttachmentPreview({
  attachment,
  onRemove,
  onRetry,
}: {
  attachment: PendingAttachment;
  onRemove: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-border/50 bg-muted/40 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachment.previewUrl}
        alt={attachment.file.name}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {attachment.status === 'uploading' ? (
        <div className="absolute inset-0 bg-black/50 grid place-items-center">
          <Loader2 className="h-5 w-5 text-white animate-spin" />
        </div>
      ) : null}
      {attachment.status === 'error' ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label="Retry upload"
          className="absolute inset-0 bg-[hsl(var(--error)/0.85)] grid place-items-center text-white"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove attachment"
        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/65 text-white grid place-items-center hover:bg-black/85"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
  onImageClick,
}: {
  message: ChatMessage;
  isOwn: boolean;
  onImageClick: (url: string) => void;
}) {
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

  const hasAttachments = message.attachments && message.attachments.length > 0;
  /* "Caption" is the textual content alongside an image. When the sent
     message has only attachments we synthesised a placeholder string —
     don't render it. */
  const captionTrim = message.content.trim();
  const isPlaceholder = captionTrim === '📎 Attachment';
  const showCaption = captionTrim.length > 0 && !isPlaceholder;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-lg overflow-hidden ${
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        } ${hasAttachments ? 'pb-2' : ''}`}
      >
        {hasAttachments ? (
          <AttachmentGrid
            attachments={message.attachments}
            onImageClick={onImageClick}
          />
        ) : null}
        {showCaption ? (
          <p className="text-sm whitespace-pre-wrap break-words px-3 pt-2">
            {message.content}
          </p>
        ) : null}
        <div
          className={`text-[10px] mt-1 flex items-center gap-1 justify-end px-3 ${
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          } ${hasAttachments && !showCaption ? 'pt-2' : ''}`}
        >
          <span>{time}</span>
          {isOwn && <span>{message.readAt ? '✓✓' : '✓'}</span>}
        </div>
      </div>
    </div>
  );
}

function AttachmentGrid({
  attachments,
  onImageClick,
}: {
  attachments: string[];
  onImageClick: (url: string) => void;
}) {
  const count = attachments.length;
  /* 1 attachment: tall 200px-h hero. 2-4: 2-column grid of 100×100 tiles. */
  if (count === 1) {
    return (
      <button
        type="button"
        onClick={() => onImageClick(attachments[0])}
        className="block w-full bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachments[0]}
          alt="Attachment"
          className="block h-[200px] w-full object-cover"
          loading="lazy"
        />
      </button>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-0.5 bg-black/20">
      {attachments.slice(0, 4).map((url, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onImageClick(url)}
          className="relative aspect-square overflow-hidden bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Attachment ${i + 1}`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  /* Escape-to-close. Listener attached at body so focus state inside the
     overlay doesn't matter. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm grid place-items-center p-4 cursor-zoom-out"
    >
      <button
        type="button"
        aria-label="Close preview"
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Attachment preview"
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
