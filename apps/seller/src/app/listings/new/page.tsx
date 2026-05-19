'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  Gamepad2,
  ImageOff,
  Image as ImageIcon,
  Info,
  Layers,
  Lightbulb,
  Package,
  Plus,
  Save,
  Sparkles,
  Tag,
  Truck,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { Input, motion, AnimatePresence, toast } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useCreateListing } from '@/hooks/use-seller-listings';
import { useAuth } from '@/hooks/use-auth';
import { useGames, useGame } from '@/hooks/use-games';
import { DynamicForm, type FormField } from '@/components/dynamic-form';

/* GETX Seller — Create Listing Wizard.
   ─────────────────────────────────────────────────────────────────────
   Replaces the single tall form with a guided 5-step wizard:

      1. Category    → Game + listing type tiles
      2. Details     → Title, description, item-specifics
      3. Photos      → Image URLs with live thumbnails
      4. Pricing     → Price, sale price, stock, auto-discount
      5. Delivery    → Instant vs manual, ETA

   Right-hand pane carries a LIVE PREVIEW of how the listing will look
   to buyers — updates as the seller types. Bottom sticky bar shows
   step pips + error count + Back / Save draft / Next-or-Publish.

   Inspired by eldorado.gg's stepped editor and zeusx's preview pane,
   then pushed further with autosave hints, smart price ranges and a
   tips column at every step. */

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
type StepKey = 'category' | 'details' | 'photos' | 'pricing' | 'delivery';

const TAB_TO_SLUG: Record<TabType, string> = {
  ACCOUNTS: 'accounts',
  TOP_UPS: 'top-ups',
  ITEMS: 'items',
};

const TAB_META: Record<
  TabType,
  { label: string; description: string; icon: typeof Tag; tone: string }
> = {
  ACCOUNTS: {
    label: 'Accounts',
    description: 'Sell a full game account (login, password, recovery).',
    icon: Layers,
    tone: 'primary',
  },
  TOP_UPS: {
    label: 'Top-Ups',
    description: 'Sell in-game currency or item top-ups.',
    icon: Wallet,
    tone: 'accent',
  },
  ITEMS: {
    label: 'Items',
    description: 'Sell individual game items, skins, or trades.',
    icon: Boxes,
    tone: 'success',
  },
};

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS: { key: StepKey; label: string; icon: typeof Tag }[] = [
  { key: 'category', label: 'Category', icon: Gamepad2 },
  { key: 'details', label: 'Details', icon: Tag },
  { key: 'photos', label: 'Photos', icon: ImageIcon },
  { key: 'pricing', label: 'Pricing', icon: DollarSign },
  { key: 'delivery', label: 'Delivery', icon: Truck },
];

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

  /* Form state — flat, easy to reason about. */
  const [step, setStep] = useState<StepKey>('category');
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

  const images = useMemo(
    () =>
      imagesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10),
    [imagesText],
  );

  /* Discount badge calc. */
  const priceN = parseFloat(price) || 0;
  const originalN = parseFloat(originalPrice) || 0;
  const discountPct = originalN > priceN && priceN > 0
    ? Math.round(((originalN - priceN) / originalN) * 100)
    : 0;

  /* Step-aware validation. Returns true if the *current* step is OK so
     the wizard can guard the Next button. Full validation runs on publish. */
  const stepIsValid = (s: StepKey): boolean => {
    switch (s) {
      case 'category':
        return !!gameSlug && !!tabType;
      case 'details': {
        if (!title || title.length < 5) return false;
        if (!description || description.length < 20) return false;
        for (const f of productFields) {
          if (!f.required) continue;
          const v = attributes[f.name];
          const empty =
            v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
          if (empty) return false;
        }
        return true;
      }
      case 'photos':
        return true; // photos optional
      case 'pricing': {
        const p = parseFloat(price);
        if (!p || p < 1) return false;
        if (originalPrice && parseFloat(originalPrice) <= p) return false;
        return true;
      }
      case 'delivery':
        return !!deliveryType;
    }
  };

  const validateAll = (): boolean => {
    const e: Record<string, string> = {};
    if (!title || title.length < 5) e.title = 'Title must be at least 5 characters';
    if (!description || description.length < 20)
      e.description = 'Description must be at least 20 characters';
    const p = parseFloat(price);
    if (!p || p < 1) e.price = 'Price required';
    if (originalPrice) {
      const op = parseFloat(originalPrice);
      if (op <= p) e.originalPrice = 'Original price must be higher than current price';
    }
    productFields.forEach((f) => {
      if (!f.required) return;
      const v = attributes[f.name];
      const empty =
        v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
      if (empty) e[f.name] = `${f.label} is required`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (publish: boolean) => {
    if (!validateAll()) {
      toast.error('Fix the errors below');
      // Jump to the first step that has an error
      if (errors.title || errors.description) setStep('details');
      else if (errors.price || errors.originalPrice) setStep('pricing');
      return;
    }
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

  if (!isSeller) {
    return (
      <SellerShell>
        <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-3xl mx-auto">
          <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
            <div className="grid place-items-center h-14 w-14 rounded-full bg-primary/10 text-primary mx-auto mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Activate seller mode first</h2>
            <p className="text-muted-foreground mb-6">
              You need an active seller profile before listing. It&apos;s one click.
            </p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-gradient-to-b from-primary to-primary-hover text-primary-foreground text-[13.5px] font-bold shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]"
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SellerShell>
    );
  }

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const isLast = stepIdx === STEPS.length - 1;
  const canAdvance = stepIsValid(step);
  const errorCount = Object.keys(errors).length;

  const goNext = () => {
    if (!isLast) setStep(STEPS[stepIdx + 1].key);
  };
  const goBack = () => {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1].key);
  };

  const selectedGame = games?.find((g) => g.slug === gameSlug);

  return (
    <SellerShell>
      <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-6xl mx-auto pb-32">
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="flex items-center justify-between gap-3 mb-6 flex-wrap"
        >
          <div>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1">
              <Link href="/listings" className="hover:text-foreground transition-colors">Listings</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">Create</span>
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">
              Create a new drop
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Five quick steps — buyers can see this in seconds.
            </p>
          </div>
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-muted/25 hover:bg-muted/40 text-[12.5px] font-semibold transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Link>
        </motion.div>

        {/* ── PROGRESS STEPPER ───────────────────────────────────────── */}
        <Stepper step={step} setStep={setStep} stepIsValid={stepIsValid} />

        <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 lg:gap-7">
          {/* ── ACTIVE STEP CARD ─────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              {step === 'category' && (
                <CategoryStep
                  games={games ?? []}
                  gameSlug={gameSlug}
                  setGameSlug={setGameSlug}
                  tabType={tabType}
                  setTabType={setTabType}
                />
              )}
              {step === 'details' && (
                <DetailsStep
                  title={title}
                  setTitle={setTitle}
                  description={description}
                  setDescription={setDescription}
                  errors={errors}
                  productFields={productFields}
                  attributes={attributes}
                  setAttributes={setAttributes}
                  tabType={tabType}
                />
              )}
              {step === 'photos' && (
                <PhotosStep
                  imagesText={imagesText}
                  setImagesText={setImagesText}
                  images={images}
                />
              )}
              {step === 'pricing' && (
                <PricingStep
                  price={price}
                  setPrice={setPrice}
                  originalPrice={originalPrice}
                  setOriginalPrice={setOriginalPrice}
                  stock={stock}
                  setStock={setStock}
                  discountPct={discountPct}
                  errors={errors}
                />
              )}
              {step === 'delivery' && (
                <DeliveryStep
                  deliveryType={deliveryType}
                  setDeliveryType={setDeliveryType}
                  deliveryTime={deliveryTime}
                  setDeliveryTime={setDeliveryTime}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── LIVE PREVIEW + TIPS ──────────────────────────────────── */}
          <aside className="lg:sticky lg:top-24 self-start space-y-4">
            <LivePreview
              title={title}
              price={priceN}
              originalPrice={originalN}
              discountPct={discountPct}
              tabType={tabType}
              gameName={selectedGame?.name ?? 'Game'}
              firstImage={images[0]}
              deliveryType={deliveryType}
              deliveryTime={deliveryTime}
            />
            <TipsForStep step={step} />
          </aside>
        </div>
      </div>

      {/* ── STICKY BOTTOM BAR ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/85 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <div className="hidden sm:flex items-center gap-2 text-[12px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
              Step {stepIdx + 1} of {STEPS.length}
            </span>
            <span className="text-foreground font-semibold">·</span>
            <span className="text-foreground font-semibold">{STEPS[stepIdx].label}</span>
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-error/12 text-error font-mono text-[10px] uppercase tracking-wider font-bold">
                <Info className="h-3 w-3" />
                {errorCount} issue{errorCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="flex-1 sm:flex-initial sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
            {stepIdx > 0 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-muted/25 hover:bg-muted/40 ring-1 ring-border text-[12.5px] font-semibold transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={createListing.isPending}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-surface ring-1 ring-border text-foreground/85 text-[12.5px] font-semibold hover:bg-muted/25 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save draft
            </motion.button>

            {!isLast ? (
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={goNext}
                disabled={!canAdvance}
                className="
                  flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full
                  bg-gradient-to-b from-primary to-primary-hover
                  text-primary-foreground text-[13px] font-bold tracking-tight
                  shadow-[0_8px_22px_-4px_hsl(var(--primary)/0.55)]
                  disabled:from-muted disabled:to-muted disabled:shadow-none disabled:cursor-not-allowed
                  transition-all
                "
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={createListing.isPending}
                className="
                  flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full
                  bg-gradient-to-b from-success to-success
                  text-success-foreground text-[13px] font-bold tracking-tight
                  shadow-[0_8px_22px_-4px_hsl(var(--success)/0.55)]
                  hover:opacity-90 disabled:opacity-50 transition-all
                "
              >
                <Zap className="h-4 w-4 fill-current" />
                {createListing.isPending ? 'Publishing…' : 'Publish listing'}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </SellerShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STEPPER                                                             */
/* ══════════════════════════════════════════════════════════════════ */
function Stepper({
  step,
  setStep,
  stepIsValid,
}: {
  step: StepKey;
  setStep: (s: StepKey) => void;
  stepIsValid: (s: StepKey) => boolean;
}) {
  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const progressPct = (stepIdx / (STEPS.length - 1)) * 100;

  return (
    <div className="relative">
      {/* connecting line */}
      <div className="absolute left-0 right-0 top-5 h-[3px] rounded-full bg-foreground/8 hidden sm:block" aria-hidden />
      <motion.div
        className="absolute left-0 top-5 h-[3px] rounded-full bg-gradient-to-r from-primary to-primary-hover hidden sm:block"
        animate={{ width: `${progressPct}%` }}
        transition={{ duration: 0.6, ease: EASE }}
        aria-hidden
      />

      <ol className="relative grid grid-cols-5 gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < stepIdx;
          const active = i === stepIdx;
          const ok = stepIsValid(s.key);
          return (
            <li key={s.key} className="flex flex-col items-center text-center">
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.06 }}
                type="button"
                onClick={() => setStep(s.key)}
                aria-current={active ? 'step' : undefined}
                aria-label={`Go to ${s.label} step`}
                className={`
                  relative grid place-items-center h-10 w-10 rounded-full font-bold text-[13px] transition-all
                  ${
                    done
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/15'
                      : active
                        ? 'bg-surface text-primary ring-4 ring-primary/20 ring-offset-2 ring-offset-background border-2 border-primary'
                        : 'bg-muted/40 text-muted-foreground ring-4 ring-background hover:bg-muted/60'
                  }
                `}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" strokeWidth={2.25} />}
                {active && ok && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success ring-2 ring-background grid place-items-center">
                    <Check className="h-2 w-2 text-success-foreground" strokeWidth={4} />
                  </span>
                )}
              </motion.button>
              <div className="mt-2 hidden sm:block">
                <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
                  Step {i + 1}
                </div>
                <div
                  className={`text-[12px] font-semibold mt-0.5 ${
                    active ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </div>
              </div>
              <div className="mt-2 sm:hidden font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
                {s.label}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STEP 1 — CATEGORY                                                   */
/* ══════════════════════════════════════════════════════════════════ */
function CategoryStep({
  games,
  gameSlug,
  setGameSlug,
  tabType,
  setTabType,
}: {
  games: { slug: string; name: string; icon: string; isLaunched: boolean }[];
  gameSlug: string;
  setGameSlug: (v: string) => void;
  tabType: TabType;
  setTabType: (v: TabType) => void;
}) {
  const liveGames = games.filter((g) => g.isLaunched);
  return (
    <StepCard title="Pick a game and type" hint="Buyers filter by these — choose carefully.">
      {/* Games */}
      <div>
        <SubHeading icon={Gamepad2} text="Which game" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {liveGames.map((g) => {
            const active = g.slug === gameSlug;
            return (
              <motion.button
                key={g.slug}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setGameSlug(g.slug)}
                className={`
                  relative rounded-2xl p-4 text-left ring-1 transition-all
                  ${
                    active
                      ? 'bg-primary/10 ring-primary ring-2 shadow-[0_10px_28px_-12px_hsl(var(--primary)/0.5)]'
                      : 'bg-surface ring-border hover:ring-foreground/20'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-xl bg-muted/30 overflow-hidden shrink-0">
                    {g.icon ? (
                      <Image src={g.icon} alt={g.name} fill sizes="40px" className="object-cover" unoptimized />
                    ) : (
                      <Gamepad2 className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13.5px] truncate">{g.name}</div>
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-success font-bold mt-0.5">
                      Live
                    </div>
                  </div>
                  {active && (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" strokeWidth={2.5} />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
        {liveGames.length === 0 && (
          <div className="text-[13px] text-muted-foreground py-4 text-center bg-muted/20 rounded-xl">
            Loading games…
          </div>
        )}
      </div>

      {/* Tab type */}
      <div className="mt-6">
        <SubHeading icon={Layers} text="What are you selling" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(['ACCOUNTS', 'TOP_UPS', 'ITEMS'] as TabType[]).map((t) => {
            const meta = TAB_META[t];
            const Icon = meta.icon;
            const active = tabType === t;
            const tones: Record<string, string> = {
              primary: 'bg-primary/10 text-primary ring-primary/30',
              accent: 'bg-accent/10 text-accent ring-accent/30',
              success: 'bg-success/10 text-success ring-success/30',
            };
            return (
              <motion.button
                key={t}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setTabType(t)}
                className={`
                  relative rounded-2xl p-4 text-left ring-1 transition-all
                  ${
                    active
                      ? `${tones[meta.tone]} ring-2 shadow-[0_10px_28px_-12px_hsl(var(--primary)/0.4)]`
                      : 'bg-surface ring-border hover:ring-foreground/20'
                  }
                `}
              >
                <div className={`grid place-items-center h-10 w-10 rounded-xl mb-2.5 ${active ? 'bg-current/15' : 'bg-muted/30 text-muted-foreground'}`}>
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="font-display font-bold text-[14.5px]">{meta.label}</div>
                <div className="text-[11.5px] text-muted-foreground mt-1 leading-snug">
                  {meta.description}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STEP 2 — DETAILS                                                    */
/* ══════════════════════════════════════════════════════════════════ */
function DetailsStep({
  title,
  setTitle,
  description,
  setDescription,
  errors,
  productFields,
  attributes,
  setAttributes,
  tabType,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  errors: Record<string, string>;
  productFields: FormField[];
  attributes: Record<string, unknown>;
  setAttributes: (
    fn: (prev: Record<string, unknown>) => Record<string, unknown>,
  ) => void;
  tabType: TabType;
}) {
  /* Title quality indicator — gives the seller fast feedback about
     whether their title is in the buyer-converting zone. */
  const titleQuality = (() => {
    if (title.length === 0) return { label: 'Start typing', tone: 'muted' };
    if (title.length < 5) return { label: 'Too short', tone: 'error' };
    if (title.length < 30) return { label: 'A bit short', tone: 'warning' };
    if (title.length > 120) return { label: 'Trim it down', tone: 'warning' };
    return { label: 'Looks great', tone: 'success' };
  })();
  const titleTone: Record<string, string> = {
    muted: 'text-muted-foreground',
    error: 'text-error',
    warning: 'text-warning',
    success: 'text-success',
  };

  return (
    <StepCard title="Tell buyers what they're getting" hint="Clear titles + thorough descriptions sell faster.">
      <div className="space-y-5">
        <Field label="Listing title" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lv 50 Mystic · Hundo Mewtwo · 200 shinies"
            maxLength={150}
            className="h-11 text-[14px]"
          />
          <div className="flex justify-between items-center mt-1.5 text-[11px]">
            <span className={`font-medium ${titleTone[titleQuality.tone]}`}>
              {titleQuality.label}
            </span>
            <span className="font-mono text-muted-foreground tabular-nums">
              {title.length} / 150
            </span>
          </div>
          {errors.title && <FieldError msg={errors.title} />}
        </Field>

        <Field label="Description" required hint="Cover everything the buyer needs to know.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's included, account history, any special notes…"
            rows={6}
            maxLength={5000}
            className="w-full rounded-xl bg-surface ring-1 ring-border px-3.5 py-3 text-[14px] focus:outline-none focus:ring-primary/40 transition-all"
          />
          <div className="flex justify-between items-center mt-1.5 text-[11px]">
            <span className="text-muted-foreground">
              Tip: list the level, badges, legendaries, shinies, region.
            </span>
            <span className="font-mono text-muted-foreground tabular-nums">
              {description.length} / 5000
            </span>
          </div>
          {errors.description && <FieldError msg={errors.description} />}
        </Field>

        {productFields.length > 0 && (
          <div className="pt-1">
            <SubHeading icon={Sparkles} text={`${TAB_META[tabType].label} specifics`} />
            <DynamicForm
              formFields={productFields}
              addons={[]}
              values={attributes}
              onChange={(name, value) => setAttributes((prev) => ({ ...prev, [name]: value }))}
              errors={errors}
            />
          </div>
        )}
      </div>
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STEP 3 — PHOTOS                                                     */
/* ══════════════════════════════════════════════════════════════════ */
function PhotosStep({
  imagesText,
  setImagesText,
  images,
}: {
  imagesText: string;
  setImagesText: (v: string) => void;
  images: string[];
}) {
  const removeImage = (idx: number) => {
    const lines = imagesText.split('\n').map((s) => s.trim()).filter(Boolean);
    lines.splice(idx, 1);
    setImagesText(lines.join('\n'));
  };

  return (
    <StepCard
      title="Add photos buyers will see"
      hint="Listings with 3+ clear screenshots sell 2× faster."
    >
      <div>
        <label className="text-[13px] font-semibold block mb-1.5">
          Image URLs <span className="text-muted-foreground font-normal">— max 10, one per line</span>
        </label>
        <textarea
          value={imagesText}
          onChange={(e) => setImagesText(e.target.value)}
          placeholder={'https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg'}
          rows={4}
          className="w-full rounded-xl bg-surface ring-1 ring-border px-3.5 py-3 text-[13px] font-mono focus:outline-none focus:ring-primary/40 transition-all"
        />
        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
          <Info className="h-3 w-3" />
          Direct uploads land in a later release — paste from your image host for now.
        </p>
      </div>

      {/* Live preview thumbnails */}
      {images.length > 0 && (
        <div className="mt-5">
          <SubHeading icon={ImageIcon} text={`${images.length} photo${images.length === 1 ? '' : 's'} ready`} />
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {images.map((src, idx) => (
              <motion.div
                key={src + idx}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04, duration: 0.25, ease: EASE }}
                className="relative aspect-square rounded-xl bg-muted/40 overflow-hidden ring-1 ring-border group"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized
                />
                {idx === 0 && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground font-mono text-[8.5px] uppercase tracking-wider font-bold">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  aria-label="Remove image"
                  className="absolute top-1 right-1 grid place-items-center h-7 w-7 rounded-full bg-black/65 text-white ring-1 ring-white/20 backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 hover:bg-error transition-all"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STEP 4 — PRICING                                                    */
/* ══════════════════════════════════════════════════════════════════ */
function PricingStep({
  price,
  setPrice,
  originalPrice,
  setOriginalPrice,
  stock,
  setStock,
  discountPct,
  errors,
}: {
  price: string;
  setPrice: (v: string) => void;
  originalPrice: string;
  setOriginalPrice: (v: string) => void;
  stock: string;
  setStock: (v: string) => void;
  discountPct: number;
  errors: Record<string, string>;
}) {
  const priceN = parseFloat(price) || 0;
  const fee = priceN * 0.08; // GETX seller cut — display estimate only
  const youKeep = priceN - fee;

  return (
    <StepCard title="Set a price buyers can't refuse" hint="GETX takes 8%. Net earnings shown live below.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Price (USD)" required>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-display font-bold">$</span>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="99.99"
              min={1}
              step={0.01}
              className="pl-7 h-11 text-[14px] font-display font-bold tabular-nums"
            />
          </div>
          {errors.price && <FieldError msg={errors.price} />}
        </Field>

        <Field label="Original price" hint="Optional · shows a strikethrough.">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-display font-bold">$</span>
            <Input
              type="number"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="129.99"
              min={1}
              step={0.01}
              className="pl-7 h-11 text-[14px] font-display font-bold tabular-nums"
            />
          </div>
          {errors.originalPrice && <FieldError msg={errors.originalPrice} />}
        </Field>

        <Field label="Stock" hint="Use −1 for unlimited.">
          <Input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            min={-1}
            className="h-11 text-[14px] font-display font-bold tabular-nums"
          />
        </Field>
      </div>

      {/* Discount + net earnings preview */}
      {priceN > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mt-5 rounded-2xl bg-gradient-to-br from-primary/8 via-surface to-surface ring-1 ring-primary/15 p-4 sm:p-5"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-3">
            Earnings preview
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 min-w-0">
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[10.5px] text-muted-foreground uppercase tracking-wider mb-1 truncate">Buyer pays</div>
              <div className="font-display font-extrabold text-[clamp(1rem,4vw,1.5rem)] tabular-nums truncate">${priceN.toFixed(2)}</div>
            </div>
            <div className="border-l border-border pl-2 sm:pl-4 min-w-0">
              <div className="text-[10px] sm:text-[10.5px] text-muted-foreground uppercase tracking-wider mb-1 truncate">GETX fee 8%</div>
              <div className="font-display font-bold text-[clamp(1rem,4vw,1.5rem)] tabular-nums text-foreground/60 truncate">
                −${fee.toFixed(2)}
              </div>
            </div>
            <div className="border-l border-success/20 pl-2 sm:pl-4 min-w-0">
              <div className="text-[10px] sm:text-[10.5px] text-success uppercase tracking-wider mb-1 font-bold truncate">You keep</div>
              <div className="font-display font-extrabold text-[clamp(1rem,4vw,1.5rem)] tabular-nums text-success truncate">
                ${youKeep.toFixed(2)}
              </div>
            </div>
          </div>
          {discountPct > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-hot text-hot-foreground font-mono text-[10px] uppercase tracking-wider font-bold">
                −{discountPct}% off
              </span>
              <span className="text-[12px] text-muted-foreground">
                Buyers see this as a sale — drives conversion.
              </span>
            </div>
          )}
        </motion.div>
      )}
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  STEP 5 — DELIVERY                                                   */
/* ══════════════════════════════════════════════════════════════════ */
function DeliveryStep({
  deliveryType,
  setDeliveryType,
  deliveryTime,
  setDeliveryTime,
}: {
  deliveryType: 'INSTANT' | 'MANUAL';
  setDeliveryType: (v: 'INSTANT' | 'MANUAL') => void;
  deliveryTime: string;
  setDeliveryTime: (v: string) => void;
}) {
  const options: {
    key: 'INSTANT' | 'MANUAL';
    icon: typeof Zap;
    title: string;
    body: string;
    tone: string;
  }[] = [
    {
      key: 'INSTANT',
      icon: Zap,
      title: 'Instant delivery',
      body: 'Credentials/code sent automatically when buyer pays. Best for top-ups and codes.',
      tone: 'success',
    },
    {
      key: 'MANUAL',
      icon: Clock,
      title: 'Manual delivery',
      body: 'You deliver via chat after payment lands. Best for accounts and boosting.',
      tone: 'primary',
    },
  ];

  return (
    <StepCard title="How does the buyer get it" hint="Faster delivery means higher rating.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((o) => {
          const Icon = o.icon;
          const active = deliveryType === o.key;
          const tones: Record<string, string> = {
            primary: 'bg-primary/10 ring-primary/30 text-primary',
            success: 'bg-success/10 ring-success/30 text-success',
          };
          return (
            <motion.button
              key={o.key}
              type="button"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setDeliveryType(o.key)}
              className={`
                relative rounded-2xl p-5 text-left ring-1 transition-all
                ${
                  active
                    ? `${tones[o.tone]} ring-2 shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.45)]`
                    : 'bg-surface ring-border hover:ring-foreground/20'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`grid place-items-center h-10 w-10 rounded-xl ${active ? 'bg-current/15' : 'bg-muted/30 text-muted-foreground'}`}>
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="font-display font-bold text-[15px] flex-1">{o.title}</div>
                {active && <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />}
              </div>
              <p className={`text-[12.5px] leading-snug ${active ? 'opacity-90' : 'text-muted-foreground'}`}>
                {o.body}
              </p>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5">
        <Field label="Expected delivery time" hint="Buyers see this on the listing.">
          <Input
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            placeholder="Within 1 hour"
            className="h-11 text-[14px]"
          />
        </Field>
      </div>
    </StepCard>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  LIVE PREVIEW — what the buyer will see                              */
/* ══════════════════════════════════════════════════════════════════ */
function LivePreview({
  title,
  price,
  originalPrice,
  discountPct,
  tabType,
  gameName,
  firstImage,
  deliveryType,
  deliveryTime,
}: {
  title: string;
  price: number;
  originalPrice: number;
  discountPct: number;
  tabType: TabType;
  gameName: string;
  firstImage: string | undefined;
  deliveryType: 'INSTANT' | 'MANUAL';
  deliveryTime: string;
}) {
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary" strokeWidth={2.25} />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
          Buyer preview
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-[16/10] bg-muted/40 overflow-hidden">
        {firstImage ? (
          <Image src={firstImage} alt="" fill sizes="360px" className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <div className="text-center">
              <ImageOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-[11px]">Add a photo to preview</div>
            </div>
          </div>
        )}
        <div aria-hidden className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/55 to-transparent" />
        <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-sm ring-1 ring-white/15 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white font-bold">
          {gameName}
        </div>
        {discountPct > 0 && (
          <div className="absolute top-2.5 right-2.5 inline-flex items-center px-2 py-0.5 rounded-md bg-hot text-hot-foreground font-mono text-[10px] uppercase tracking-wider font-bold">
            −{discountPct}%
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-primary font-bold mb-1.5">
          {TAB_META[tabType].label}
        </div>
        <h3 className="font-display font-bold text-[14.5px] leading-snug line-clamp-2 min-h-[2.4em] mb-3">
          {title || <span className="text-muted-foreground">Your listing title will appear here…</span>}
        </h3>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-display font-extrabold text-2xl tabular-nums">
            ${price > 0 ? price.toFixed(2) : '0.00'}
          </span>
          {originalPrice > 0 && originalPrice > price && (
            <span className="text-[12px] text-muted-foreground line-through tabular-nums">
              ${originalPrice.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          {deliveryType === 'INSTANT' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/12 text-success font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold">
              <Zap className="h-3 w-3 fill-current" />
              Instant
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/12 text-primary font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold">
              <Clock className="h-3 w-3" />
              {deliveryTime || 'Manual'}
            </span>
          )}
          <span className="ml-auto text-[10.5px] text-muted-foreground">Escrow protected</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  TIPS PANEL — context-aware coaching                                 */
/* ══════════════════════════════════════════════════════════════════ */
const STEP_TIPS: Record<StepKey, { title: string; tips: string[] }> = {
  category: {
    title: 'Pick wisely',
    tips: [
      'Pokémon GO is the only live category — that\'s where the buyers are.',
      'Accounts have the highest avg order value. Top-Ups sell the fastest.',
    ],
  },
  details: {
    title: 'Write a buyer-magnet title',
    tips: [
      'Lead with the headline stat: "Lv 50 Mystic · Hundo Mewtwo".',
      'Mention region, badges, legendaries, OG year.',
      '30–80 character titles convert best.',
    ],
  },
  photos: {
    title: 'Photos that close sales',
    tips: [
      'Cover image = highest-impact stat (PokéDex, item, or rank screen).',
      '3+ angles double the click-through rate.',
      'Crop tightly — no UI clutter, no usernames showing.',
    ],
  },
  pricing: {
    title: 'Price like a pro',
    tips: [
      'Check the marketplace for comparable drops before setting price.',
      'A 10–20% sale beats a flat low price for ranking.',
      'Round to .99 for psychological pricing.',
    ],
  },
  delivery: {
    title: 'Faster = higher rating',
    tips: [
      'Same-day delivery is the GETX default and what buyers expect.',
      '"Within 1 hour" beats "Within 24 hours" in ranking.',
      'Auto-delivery (Instant) is required for ranking on top-up searches.',
    ],
  },
};

function TipsForStep({ step }: { step: StepKey }) {
  const data = STEP_TIPS[step];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="rounded-2xl bg-gradient-to-br from-accent/10 via-surface to-surface ring-1 ring-accent/20 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-accent" strokeWidth={2.5} />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent font-bold">
            {data.title}
          </span>
        </div>
        <ul className="space-y-1.5">
          {data.tips.map((t, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] text-foreground/85 leading-snug">
              <span className="text-accent shrink-0 mt-0.5">•</span>
              {t}
            </li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  PRIMITIVES                                                          */
/* ══════════════════════════════════════════════════════════════════ */
function StepCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border p-5 sm:p-7">
      <div className="mb-5">
        <h2 className="font-display text-xl lg:text-2xl font-extrabold tracking-tight">{title}</h2>
        {hint && <p className="text-[13px] text-muted-foreground mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function SubHeading({ icon: Icon, text }: { icon: typeof Tag; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="grid place-items-center h-6 w-6 rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/80 font-bold">
        {text}
      </span>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] font-semibold text-foreground">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </span>
        {hint && !required && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </label>
      {children}
      {required && hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="text-error text-[11.5px] mt-1.5 flex items-center gap-1">
      <Info className="h-3 w-3" />
      {msg}
    </p>
  );
}

/* Silence unused-warning for icons referenced via render helpers. */
void Plus;
void ArrowUpRight;
void Package;
