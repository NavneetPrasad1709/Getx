'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, toast } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useCreateListing } from '@/hooks/use-seller-listings';
import { useAuth } from '@/hooks/use-auth';
import { useGames, useGame } from '@/hooks/use-games';
import { DynamicForm, type FormField } from '@/components/dynamic-form';

interface TabConfig {
  slug?: string;
  productFields?: FormField[];
}

interface FieldsConfig {
  tabs?: TabConfig[];
}

interface GameDetail {
  fieldsConfig?: FieldsConfig;
}

type TabType = 'ACCOUNTS' | 'TOP_UPS' | 'ITEMS';

const TAB_TO_SLUG: Record<TabType, string> = {
  ACCOUNTS: 'accounts',
  TOP_UPS: 'top-ups',
  ITEMS: 'items',
};

function extractAxiosMessage(err: unknown): string | null {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? null;
  }
  return null;
}

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isSeller = !!user?.isSeller;
  const createListing = useCreateListing();

  const { data: games } = useGames();

  const [gameSlug, setGameSlug] = useState('pokemon-go');
  const [tabType, setTabType] = useState<TabType>('ACCOUNTS');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [deliveryType, setDeliveryType] = useState<'INSTANT' | 'MANUAL'>('MANUAL');
  const [deliveryTime, setDeliveryTime] = useState('Within 1 hour');
  const [imagesText, setImagesText] = useState('');
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: gameRaw } = useGame(gameSlug);
  const game = gameRaw as GameDetail | undefined;

  const productFields = useMemo<FormField[]>(() => {
    const tabSlug = TAB_TO_SLUG[tabType];
    const tab = game?.fieldsConfig?.tabs?.find((t) => t.slug === tabSlug);
    return tab?.productFields ?? [];
  }, [game, tabType]);

  if (!isSeller) {
    return (
      <SellerShell>
        <div className="container max-w-3xl py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="font-display text-2xl font-bold mb-2">Activate seller mode first</h2>
              <p className="text-muted-foreground mb-6">
                Go to the dashboard to activate seller mode before creating listings.
              </p>
              <Button onClick={() => router.push('/')}>Go to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </SellerShell>
    );
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title || title.length < 5) {
      e.title = 'Title must be at least 5 characters';
    }
    if (!description || description.length < 20) {
      e.description = 'Description must be at least 20 characters';
    }
    const p = parseFloat(price);
    if (!p || p < 1) e.price = 'Price required';
    if (originalPrice) {
      const op = parseFloat(originalPrice);
      if (op <= p) {
        e.originalPrice = 'Original price must be higher than current price';
      }
    }
    productFields.forEach((field) => {
      if (!field.required) return;
      const v = attributes[field.name];
      const empty =
        v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
      if (empty) e[field.name] = `${field.label} is required`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (publish: boolean) => {
    if (!validate()) {
      toast.error('Fix the errors below');
      return;
    }

    const images = imagesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    try {
      await createListing.mutateAsync({
        gameSlug,
        tabType,
        productType: TAB_TO_SLUG[tabType],
        title,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        stock: parseInt(stock, 10),
        images,
        attributes,
        deliveryType,
        deliveryTime: deliveryTime || undefined,
        publish,
      });
      toast.success(publish ? 'Listing published!' : 'Saved as draft');
      router.push('/listings');
    } catch (err) {
      toast.error(extractAxiosMessage(err) ?? 'Failed to create listing');
    }
  };

  return (
    <SellerShell>
      <div className="container max-w-4xl py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Create Listing</h1>
        <p className="text-muted-foreground mb-8">
          List your accounts, top-ups, or items for buyers to purchase.
        </p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Game</label>
                <select
                  value={gameSlug}
                  onChange={(e) => setGameSlug(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {games
                    ?.filter((g) => g.isLaunched)
                    .map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Type</label>
                <select
                  value={tabType}
                  onChange={(e) => setTabType(e.target.value as TabType)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ACCOUNTS">Accounts</option>
                  <option value="TOP_UPS">Top-Ups</option>
                  <option value="ITEMS">Items</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Listing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Title <span className="text-error">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Lvl 50 Mystic - 200 Shinies"
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
                  placeholder="Describe what's included, condition, any specifics..."
                  rows={5}
                  maxLength={5000}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{description.length}/5000</p>
                  {errors.description && <p className="text-error text-xs">{errors.description}</p>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">Photos (URLs, max 10)</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Paste image URLs (one per line). Photo upload widget arrives in a later prompt.
                </p>
                <textarea
                  value={imagesText}
                  onChange={(e) => setImagesText(e.target.value)}
                  placeholder="https://example.com/image1.jpg"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {productFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Item Specifics</CardTitle>
              </CardHeader>
              <CardContent>
                <DynamicForm
                  formFields={productFields}
                  addons={[]}
                  values={attributes}
                  onChange={(name, value) => setAttributes((prev) => ({ ...prev, [name]: value }))}
                  errors={errors}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Pricing &amp; Stock</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Price (USD) <span className="text-error">*</span>
                </label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="99.99"
                  min={1}
                  step={0.01}
                />
                {errors.price && <p className="text-error text-xs mt-1">{errors.price}</p>}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Original price (optional)
                </label>
                <Input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="Was $X"
                  min={1}
                  step={0.01}
                />
                {errors.originalPrice && (
                  <p className="text-error text-xs mt-1">{errors.originalPrice}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Stock (-1 = unlimited)</label>
                <Input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  min={-1}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Delivery type</label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as 'INSTANT' | 'MANUAL')}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="MANUAL">Manual delivery</option>
                  <option value="INSTANT">Instant (auto-delivery)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Delivery time</label>
                <Input
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="e.g., Within 1 hour"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={createListing.isPending}
            >
              Save as Draft
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={createListing.isPending}>
              {createListing.isPending ? 'Publishing...' : 'Publish Listing'}
            </Button>
          </div>
        </div>
      </div>
    </SellerShell>
  );
}
