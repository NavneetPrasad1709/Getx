'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  toast,
} from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useRequest } from '@/hooks/use-seller-requests';
import { useCreateOffer } from '@/hooks/use-seller-offers';
import { useAuth } from '@/hooks/use-auth';

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function extractAxiosMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { user } = useAuth();
  const isSeller = !!user?.isSeller;

  const { data: request, isLoading } = useRequest(id);
  const createOffer = useCreateOffer();

  const [price, setPrice] = useState('');
  const [deliveryHours, setDeliveryHours] = useState('24');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const myOffer = request?.offers?.find((o) => o.sellerId === user?.id);
  const isOwnRequest = request?.buyer.id === user?.id;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const p = parseFloat(price);
    if (!p || p < 1) e.price = 'Price required';
    if (request && p > request.budgetMax * 1.5) {
      e.price = `Max allowed: $${(request.budgetMax * 1.5).toFixed(2)}`;
    }
    const h = parseInt(deliveryHours, 10);
    if (!h || h < 1) e.deliveryHours = 'Required';
    if (!message || message.length < 20) {
      e.message = 'Pitch must be at least 20 characters';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createOffer.mutateAsync({
        requestId: id,
        price: parseFloat(price),
        deliveryHours: parseInt(deliveryHours, 10),
        message,
      });
      toast.success('Offer submitted! Buyer will be notified.');
      router.push('/offers');
    } catch (err) {
      toast.error(extractAxiosMessage(err) ?? 'Failed to submit offer');
    }
  };

  if (isLoading) {
    return (
      <SellerShell>
        <div className="container max-w-5xl py-8">
          <Skeleton className="h-96" />
        </div>
      </SellerShell>
    );
  }

  if (!request) {
    return (
      <SellerShell>
        <div className="container max-w-3xl py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="font-display text-2xl font-bold mb-2">Request not found</h2>
              <Link href="/requests">
                <Button>Back to requests</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </SellerShell>
    );
  }

  const attrs = request.attributes;

  return (
    <SellerShell>
      <div className="container max-w-5xl py-8">
        <Link href="/requests" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to requests
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-sm text-muted-foreground font-mono">
                  {request.requestNumber}
                </span>
                <Badge variant="secondary">{request.tabType}</Badge>
                {request.subCategory && <Badge variant="default">{request.subCategory}</Badge>}
              </div>
              <h1 className="font-display text-2xl font-bold mb-2">{request.title}</h1>
              <p className="text-muted-foreground whitespace-pre-line">{request.description}</p>
            </div>

            {Object.keys(attrs).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Specifics</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Object.entries(attrs).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          {humanize(key)}
                        </dt>
                        <dd className="font-semibold text-sm break-words">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 space-y-1.5 text-sm">
                <div>
                  <span className="font-medium">Budget:</span> ${request.budgetMin.toFixed(2)} - $
                  {request.budgetMax.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Delivery:</span> {request.deliveryDays} days max
                </div>
                <div>
                  <span className="font-medium">Current offers:</span> {request.offerCount}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardHeader>
                <CardTitle>Submit Your Offer</CardTitle>
              </CardHeader>
              <CardContent>
                {!isSeller ? (
                  <p className="text-sm text-muted-foreground">Activate seller mode to bid.</p>
                ) : isOwnRequest ? (
                  <p className="text-sm text-muted-foreground">
                    You can&apos;t bid on your own request.
                  </p>
                ) : myOffer ? (
                  <div>
                    <p className="text-sm mb-3">You&apos;ve already submitted an offer:</p>
                    <div className="p-3 rounded bg-muted/30">
                      <div className="font-bold">${myOffer.price.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {myOffer.deliveryHours}h delivery · Status: {myOffer.status}
                      </div>
                    </div>
                  </div>
                ) : request.status !== 'OPEN' ? (
                  <p className="text-sm text-muted-foreground">
                    This request is no longer accepting offers.
                  </p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Your price (USD)</label>
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder={`$${request.budgetMin}-${request.budgetMax}`}
                        min={1}
                        step={0.01}
                      />
                      {errors.price && <p className="text-error text-xs mt-1">{errors.price}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Delivery (hours)</label>
                      <Input
                        type="number"
                        value={deliveryHours}
                        onChange={(e) => setDeliveryHours(e.target.value)}
                        min={1}
                        max={720}
                      />
                      {errors.deliveryHours && (
                        <p className="text-error text-xs mt-1">{errors.deliveryHours}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Pitch (why you?)</label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Convince the buyer why you're the best for this job..."
                        rows={5}
                        maxLength={2000}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{message.length}/2000</p>
                      {errors.message && <p className="text-error text-xs">{errors.message}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={createOffer.isPending}>
                      {createOffer.isPending ? 'Submitting...' : 'Submit Offer'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SellerShell>
  );
}
