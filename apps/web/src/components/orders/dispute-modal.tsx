'use client';

import * as React from 'react';
import { AxiosError } from 'axios';
import {
  X,
  ShieldAlert,
  Upload,
  Loader2,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { Button, toast } from '@getx/ui';
import { api } from '@/lib/api';
import { useUploadImage } from '@/hooks/use-upload';

/* DisputeModal — buyer-facing dispute creation flow.

   Reason → 30-char description → up to 5 image evidence → submit.
   Resilient to partial upload failures (retry per attachment). Submit is
   blocked until the description hits minimum length and every staged
   attachment has finished uploading. */

interface Props {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSuccess?: (dispute: { id: string; disputeNumber: string }) => void;
}

const REASONS: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  {
    value: 'NOT_DELIVERED',
    label: "Didn't receive",
    description: "Seller marked delivered but I haven't received anything.",
  },
  {
    value: 'WRONG_ITEM',
    label: 'Not as described',
    description: 'Account or items differ from the listing.',
  },
  {
    value: 'ACCOUNT_RECOVERED',
    label: "Credentials don't work",
    description: "Login / linked email / 2FA isn't usable.",
  },
  {
    value: 'COMMUNICATION_ISSUE',
    label: 'Seller unresponsive',
    description: 'No reply for over 24h after payment.',
  },
  {
    value: 'OTHER',
    label: 'Other',
    description: 'Something else — describe below.',
  },
];

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'done' | 'error';
  uploadedUrl?: string;
}

export function DisputeModal({
  orderId,
  orderNumber,
  onClose,
  onSuccess,
}: Props) {
  const [reason, setReason] = React.useState<string>('NOT_DELIVERED');
  const [description, setDescription] = React.useState('');
  const [pending, setPending] = React.useState<PendingFile[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const upload = useUploadImage();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  React.useEffect(() => {
    return () => {
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadOne = async (file: PendingFile) => {
    try {
      const { url } = await upload.mutateAsync(file.file);
      setPending((prev) =>
        prev.map((p) =>
          p.id === file.id ? { ...p, status: 'done', uploadedUrl: url } : p,
        ),
      );
    } catch {
      setPending((prev) =>
        prev.map((p) => (p.id === file.id ? { ...p, status: 'error' } : p)),
      );
    }
  };

  const addFiles = (files: FileList) => {
    const accepted: File[] = [];
    let bad = 0;
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith('image/') || f.size > MAX_BYTES) {
        bad += 1;
        return;
      }
      accepted.push(f);
    });
    if (bad > 0) toast.error('Images only · 5MB max');
    const room = MAX_FILES - pending.length;
    if (room <= 0) {
      toast.error(`Max ${MAX_FILES} files`);
      return;
    }
    const next = accepted.slice(0, room).map((file) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'uploading' as const,
    }));
    setPending((prev) => [...prev, ...next]);
    next.forEach((f) => void uploadOne(f));
  };

  const removeFile = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const retryFile = (id: string) => {
    const target = pending.find((p) => p.id === id);
    if (!target) return;
    setPending((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'uploading' } : p)),
    );
    void uploadOne({ ...target, status: 'uploading' });
  };

  const anyUploading = pending.some((p) => p.status === 'uploading');
  const evidenceUrls = pending
    .filter((p) => p.status === 'done' && p.uploadedUrl)
    .map((p) => p.uploadedUrl as string);
  const canSubmit =
    !submitting &&
    !anyUploading &&
    description.trim().length >= 30 &&
    !!reason;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data } = await api.post<{ id: string; disputeNumber: string }>(
        `/orders/${orderId}/dispute`,
        {
          reason,
          description: description.trim(),
          evidence: evidenceUrls,
        },
      );
      toast.success(`Dispute ${data.disputeNumber} opened — review within 6 hours`);
      onSuccess?.(data);
      onClose();
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not open dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Open a dispute"
      onClick={onClose}
      className="fixed inset-0 z-[75] bg-black/65 backdrop-blur-sm grid place-items-center p-4"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-[hsl(var(--background))] border border-border/60 shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="h-10 w-10 rounded-full bg-[hsl(var(--error)/0.12)] text-[hsl(var(--error))] grid place-items-center shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold">
                Open a dispute
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Order {orderNumber} · funds remain in escrow while we review
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full grid place-items-center text-muted-foreground hover:bg-[hsl(var(--surface-elevated))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Reason picker */}
        <fieldset className="mb-5">
          <legend className="text-[12px] font-semibold mb-2">
            What went wrong?
          </legend>
          <ul className="space-y-2">
            {REASONS.map((r) => (
              <li key={r.value}>
                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                    reason === r.value
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)]'
                      : 'border-border/60 bg-surface/40 hover:border-[hsl(var(--primary)/0.4)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-[hsl(var(--primary))] mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{r.label}</div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {r.description}
                    </div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {/* Description */}
        <div className="mb-5">
          <label className="block text-[12px] font-semibold mb-1.5">
            Describe what happened
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="When did you notice the issue? What does the seller's last message say? Include timestamps if you have them."
            className="w-full rounded-xl border border-border/60 bg-[hsl(var(--surface))] px-3 py-2.5 text-[13px] outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.18)]"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Minimum 30 characters</span>
            <span
              className={
                description.trim().length < 30
                  ? 'text-[hsl(var(--error))]'
                  : 'text-[hsl(var(--success))]'
              }
            >
              {description.trim().length} / 2000
            </span>
          </div>
        </div>

        {/* Evidence uploads */}
        <div className="mb-5">
          <label className="block text-[12px] font-semibold mb-1.5">
            Evidence (optional, up to {MAX_FILES} images)
          </label>
          <div className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <EvidenceTile
                key={p.id}
                file={p}
                onRemove={() => removeFile(p.id)}
                onRetry={() => retryFile(p.id)}
              />
            ))}
            {pending.length < MAX_FILES ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-20 rounded-xl border border-dashed border-border bg-[hsl(var(--surface-elevated)/0.4)] grid place-items-center text-muted-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.04)]"
                aria-label="Attach evidence"
              >
                <Upload className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* Trust copy */}
        <div className="rounded-xl bg-[hsl(var(--surface-elevated))] p-3 text-[11.5px] text-muted-foreground mb-5">
          Our team reviews disputes within 6 hours. Funds remain in escrow
          while open. Both you and the seller can add evidence at any time.
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            loadingText="Submitting…"
            disabled={!canSubmit}
            className="rounded-full bg-[hsl(var(--error))] hover:bg-[hsl(var(--error)/0.85)]"
          >
            Open dispute
          </Button>
        </div>
      </form>
    </div>
  );
}

function EvidenceTile({
  file,
  onRemove,
  onRetry,
}: {
  file: PendingFile;
  onRemove: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-border/60 bg-[hsl(var(--surface-elevated))]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={file.previewUrl}
        alt={file.file.name}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {file.status === 'uploading' ? (
        <div className="absolute inset-0 bg-black/50 grid place-items-center">
          <Loader2 className="h-4 w-4 text-white animate-spin" />
        </div>
      ) : null}
      {file.status === 'error' ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label="Retry upload"
          className="absolute inset-0 bg-[hsl(var(--error)/0.85)] grid place-items-center text-white"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/65 text-white grid place-items-center hover:bg-black/85"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
