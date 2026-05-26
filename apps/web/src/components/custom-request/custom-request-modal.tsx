'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Button, Card, Input, toast } from '@getx/ui';
import { useCreateRequest, type RequestTabType } from '@/hooks/use-custom-requests';
import { useUploadImage } from '@/hooks/use-upload';
import { useAuth } from '@/hooks/use-auth';

interface ImageState {
  url: string;
  key: string;
  uploading?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  gameSlug: string;
  tabType: RequestTabType;
  prefillTitle?: string;
}

const MAX_IMAGES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const TAB_LABELS: Record<RequestTabType, string> = {
  ACCOUNTS: 'account',
  TOP_UPS: 'top-up',
  ITEMS: 'item bundle',
  BOOSTING: 'boosting service',
};

function extractAxiosMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

export function CustomRequestModal({ open, onClose, gameSlug, tabType, prefillTitle = '' }: Props) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(prefillTitle);
  const [description, setDescription] = useState('');
  /* Buyer-set budget + delivery removed per testing feedback — sellers
     now propose both in their offer. Currency dropdown lets the buyer
     declare which currency they want bids quoted in. */
  const [currency, setCurrency] = useState('USD');
  const [images, setImages] = useState<ImageState[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);

  const createRequest = useCreateRequest();
  const uploadImage = useUploadImage();

  useEffect(() => {
    if (open) {
      setTitle(prefillTitle);
      setDescription('');
      setCurrency('USD');
      setImages([]);
      setErrors({});
    }
  }, [open, prefillTitle]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      if (!isAuthenticated) {
        toast.info('Please login to upload images');
        return;
      }

      const fileArray = Array.from(files);
      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_IMAGES} images allowed`);
        return;
      }

      const toUpload = fileArray.slice(0, remaining);

      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name}: Only images allowed`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`${file.name}: Max 5MB`);
          continue;
        }

        const tempUrl = URL.createObjectURL(file);
        const tempKey = `temp-${Date.now()}-${Math.random()}`;
        setImages((prev) => [...prev, { url: tempUrl, key: tempKey, uploading: true }]);

        try {
          const result = await uploadImage.mutateAsync(file);
          setImages((prev) =>
            prev.map((img) => (img.key === tempKey ? { url: result.url, key: result.key } : img)),
          );
          URL.revokeObjectURL(tempUrl);
        } catch (error) {
          toast.error(extractAxiosMessage(error) ?? `Failed to upload ${file.name}`);
          setImages((prev) => prev.filter((img) => img.key !== tempKey));
          URL.revokeObjectURL(tempUrl);
        }
      }
    },
    [images.length, isAuthenticated, uploadImage],
  );

  const removeImage = (key: string) => {
    setImages((prev) => prev.filter((img) => img.key !== key));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!title || title.length < 5) next.title = 'Title must be at least 5 characters';
    if (!description || description.length < 20) {
      next.description = 'Description must be at least 20 characters';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      onClose();
      toast.info('Please login to post a request');
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!validate()) {
      toast.error('Please fix the errors');
      return;
    }

    if (images.some((img) => img.uploading)) {
      toast.info('Wait for image uploads to complete');
      return;
    }

    try {
      const request = await createRequest.mutateAsync({
        gameSlug,
        tabType,
        title,
        description,
        images: images.map((img) => img.url),
        currency,
        /* Buyer no longer sets budget or timeline — sellers propose both
           in their offers. Send zeros so the API schema (which still
           types the columns as numbers) stays satisfied during transition. */
        budgetMin: 0,
        budgetMax: 0,
        deliveryDays: 0,
        attributes: {},
      });

      toast.success('Request posted! Sellers will start bidding.', {
        action: {
          label: 'View',
          onClick: () => router.push(`/requests/${request.id}`),
        },
      });
      onClose();
    } catch (error) {
      toast.error(extractAxiosMessage(error) ?? 'Failed to create request');
    }
  };

  if (!open) return null;

  const label = TAB_LABELS[tabType];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <Card
        className="w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-b-none sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between p-6 border-b sticky top-0 bg-card z-10">
            <div>
              <h2 className="font-display text-2xl font-bold">Post Custom Request</h2>
              <p className="text-sm text-muted-foreground">
                Can&apos;t find the right {label}? Sellers will bid for your job.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-2 -mr-2"
              aria-label="Close"
            >
              <span className="text-2xl leading-none">×</span>
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="text-sm font-medium block mb-1.5">
                What do you need? <span className="text-error">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., Looking for ${label}...`}
                maxLength={150}
              />
              {errors.title && <p className="text-error text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">
                Description <span className="text-error">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your requirements in detail. The more specific, the better offers you'll receive."
                rows={4}
                maxLength={2000}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{description.length}/2000</p>
                {errors.description && <p className="text-error text-xs">{errors.description}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">
                Photos (optional, max {MAX_IMAGES})
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-input hover:border-primary/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <div className="text-3xl mb-2 text-muted-foreground">+</div>
                <p className="text-sm font-medium mb-1">Click to upload or drag &amp; drop</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB each</p>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                  {images.map((img) => (
                    <div
                      key={img.key}
                      className="relative aspect-square rounded-md overflow-hidden bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt="Reference attached to your request"
                        className={`w-full h-full object-cover ${img.uploading ? 'opacity-50' : ''}`}
                      />
                      {img.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-xs text-white bg-black/60 px-2 py-1 rounded">
                            Uploading...
                          </div>
                        </div>
                      )}
                      {!img.uploading && (
                        <button
                          type="button"
                          onClick={() => removeImage(img.key)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Currency the buyer wants to receive bids in. Replaces
                the old buyer-set Budget Range + Need-it-within fields —
                price and delivery time are now seller-proposed in
                their offers (more realistic, fewer mismatched bids). */}
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Currency for bids
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm font-medium"
              >
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="AUD">AUD — Australian Dollar (A$)</option>
                <option value="CAD">CAD — Canadian Dollar (C$)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1.5">
                Sellers will quote price and delivery time in their offers.
              </p>
            </div>
          </div>

          <div className="p-6 border-t sticky bottom-0 bg-card flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="sm:order-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 sm:order-2"
              size="lg"
              disabled={createRequest.isPending || images.some((img) => img.uploading)}
            >
              {createRequest.isPending
                ? 'Posting...'
                : !isAuthenticated
                  ? 'Login & Post Request'
                  : 'Post Request'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
