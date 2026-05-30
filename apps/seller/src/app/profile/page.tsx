'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Globe2,
  Info,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Twitch,
  Twitter,
  Youtube,
} from 'lucide-react';
import { Input, motion, toast } from '@getx/ui';
import { SellerShell } from '@/components/seller-shell';
import { useAuth } from '@/hooks/use-auth';
import { useKycStatus, useSumsubToken, useUpdateProfile } from '@/hooks/use-profile';

/* GETX Seller — Profile + Identity.
   ─────────────────────────────────────────────────────────────────────
   The trust page. Everything a buyer sees about the seller (publicly)
   plus the operational settings the seller can tune (privately).

   Sections, top to bottom:
     1. Hero card — avatar, name, tier badge, verified chip, stats
     2. Identity verification — KYC card with state-aware actions
     3. Public profile — display name, bio, country, timezone
     4. Social handles — Twitter / Discord / YouTube / Twitch / Website
     5. Security — change password / 2FA
     6. Account — sign out, delete account

   Inline edit mode: tap "Edit" to enter editing, fields become
   editable, sticky Save/Discard footer appears at the bottom.
*/

const EASE = [0.22, 1, 0.36, 1] as const;

interface ProfileForm {
  displayName: string;
  bio: string;
  website: string;
  timezone: string;
  twitterHandle: string;
  discordHandle: string;
  youtubeHandle: string;
  twitchHandle: string;
}

function emptyForm(): ProfileForm {
  return {
    displayName: '',
    bio: '',
    website: '',
    timezone: '',
    twitterHandle: '',
    discordHandle: '',
    youtubeHandle: '',
    twitchHandle: '',
  };
}

export default function ProfilePage() {
  const { user, logout, refetch } = useAuth();
  const kyc = useKycStatus(!!user);
  const sumsub = useSumsubToken();
  const update = useUpdateProfile();

  const baseline = useMemo<ProfileForm>(() => {
    if (!user) return emptyForm();
    return {
      displayName: user.name ?? '',
      bio: '',
      website: '',
      timezone: '',
      twitterHandle: '',
      discordHandle: '',
      youtubeHandle: '',
      twitchHandle: '',
    };
  }, [user]);

  const [form, setForm] = useState<ProfileForm>(baseline);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setForm(baseline);
  }, [baseline, editing]);

  const dirty = useMemo(() => {
    return (Object.keys(form) as (keyof ProfileForm)[]).some(
      (k) => (form[k] ?? '') !== (baseline[k] ?? ''),
    );
  }, [form, baseline]);

  if (!user) {
    return (
      <SellerShell>
        <div className="px-4 sm:px-6 lg:px-10 py-10 max-w-3xl mx-auto">
          <div className="rounded-3xl bg-surface ring-1 ring-border p-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        </div>
      </SellerShell>
    );
  }

  const memberSince = user.createdAt ? new Date(user.createdAt) : null;
  const initials = (user.name ?? user.email ?? 'S').slice(0, 2).toUpperCase();
  const handleAt = user.username ? `@${user.username}` : user.email;

  const handleSave = async () => {
    try {
      const payload: Record<string, string | null> = {};
      if (form.displayName !== baseline.displayName) {
        payload.displayName = form.displayName.trim() || null;
      }
      if (form.bio !== baseline.bio) payload.bio = form.bio.trim() || null;
      if (form.website !== baseline.website) payload.website = form.website.trim() || null;
      if (form.timezone !== baseline.timezone) payload.timezone = form.timezone.trim() || null;
      const socials: (keyof ProfileForm)[] = [
        'twitterHandle',
        'discordHandle',
        'youtubeHandle',
        'twitchHandle',
      ];
      for (const k of socials) {
        if (form[k] !== baseline[k]) payload[k] = (form[k] as string).trim() || null;
      }
      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }
      await update.mutateAsync(payload);
      await refetch();
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not save changes');
    }
  };

  const handleStartKyc = async () => {
    try {
      const { mock } = await sumsub.mutateAsync();
      if (mock) {
        toast.success('KYC sandbox token issued — approve from admin tools.');
        await kyc.refetch();
      } else {
        toast.message('KYC iframe opening — coming soon to seller.getx.live');
      }
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not start KYC. Try again.');
    }
  };

  return (
    <SellerShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}
        className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto space-y-6 lg:space-y-8 pb-32"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary font-bold mb-1.5">
                Your identity
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight">
                Profile
              </h1>
              <p className="text-[13.5px] text-muted-foreground mt-1">
                What buyers see about you — and the trust signals that drive sales.
              </p>
            </div>
            {!editing && (
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-surface ring-1 ring-border hover:ring-foreground/20 text-[12.5px] font-semibold transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </motion.button>
            )}
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <HeroIdentity
            initials={initials}
            avatar={user.avatar}
            name={user.name}
            handle={handleAt}
            country={user.country}
            verifiedTier={user.verifiedTier}
            rating={user.sellerRating}
            totalSales={user.totalSales}
            memberSince={memberSince}
            kycApproved={kyc.data?.status === 'VERIFIED'}
            emailVerified={!!user.emailVerified}
          />
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <KycCard
            status={(kyc.data?.status ?? user.kycStatus) as KycStatusKey}
            submittedAt={kyc.data?.submittedAt}
            verifiedAt={kyc.data?.verifiedAt}
            rejectionReason={kyc.data?.rejectionReason}
            onStart={handleStartKyc}
            starting={sumsub.isPending}
          />
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <Section title="Public profile" hint="Buyers see this on your storefront." icon={Globe2}>
            <ReadonlyRow icon={Mail} label="Email" value={user.email} verified={!!user.emailVerified} />
            <FormRow
              icon={Sparkles}
              label="Display name"
              value={editing ? form.displayName : user.name ?? '—'}
              edit={editing}
              onChange={(v) => setForm((f) => ({ ...f, displayName: v }))}
              placeholder="What buyers see at the top of your store"
              max={60}
            />
            <FormRowMulti
              icon={MessageCircle}
              label="Bio"
              value={editing ? form.bio : '—'}
              edit={editing}
              onChange={(v) => setForm((f) => ({ ...f, bio: v }))}
              placeholder="One short paragraph — your games, your strengths, your turnaround."
              max={500}
            />
            <ReadonlyRow icon={MapPin} label="Country" value={user.country || '—'} />
            <FormRow
              icon={Clock}
              label="Timezone"
              value={editing ? form.timezone : '—'}
              edit={editing}
              onChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
              placeholder="e.g., Asia/Singapore"
              max={60}
            />
            {memberSince && (
              <ReadonlyRow
                icon={Calendar}
                label="Member since"
                value={memberSince.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
            )}
          </Section>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <Section title="Social handles" hint="Verified socials boost your trust score." icon={Star}>
            <FormRow
              icon={Globe2}
              label="Website"
              value={editing ? form.website : '—'}
              edit={editing}
              onChange={(v) => setForm((f) => ({ ...f, website: v }))}
              placeholder="https://yourstore.example"
              max={200}
            />
            <FormRow
              icon={Twitter}
              label="Twitter"
              prefix="@"
              value={editing ? form.twitterHandle : '—'}
              edit={editing}
              onChange={(v) => setForm((f) => ({ ...f, twitterHandle: v }))}
              placeholder="getxgg"
              max={40}
            />
            <FormRow
              icon={MessageCircle}
              label="Discord"
              prefix="@"
              value={editing ? form.discordHandle : '—'}
              edit={editing}
              onChange={(v) => setForm((f) => ({ ...f, discordHandle: v }))}
              placeholder="getxgg"
              max={40}
            />
            <FormRow
              icon={Youtube}
              label="YouTube"
              prefix="@"
              value={editing ? form.youtubeHandle : '—'}
              edit={editing}
              onChange={(v) => setForm((f) => ({ ...f, youtubeHandle: v }))}
              placeholder="getxgg"
              max={40}
            />
            <FormRow
              icon={Twitch}
              label="Twitch"
              prefix="@"
              value={editing ? form.twitchHandle : '—'}
              edit={editing}
              onChange={(v) => setForm((f) => ({ ...f, twitchHandle: v }))}
              placeholder="getxgg"
              max={40}
            />
          </Section>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <Section title="Security" hint="Keep your store and earnings safe." icon={Lock}>
            <ActionRow
              icon={Lock}
              label="Change password"
              hint="Manage on the main account settings page"
              href={`${process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'}/profile/settings`}
              external
            />
            <ActionRow
              icon={Shield}
              label="Two-factor authentication"
              hint="Adds an extra layer of protection at sign-in"
              soon
            />
          </Section>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
          <Section
            title="Account"
            hint="Sign out or close your account permanently."
            icon={AlertTriangle}
            tone="muted"
          >
            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center gap-3 w-full px-3 sm:px-4 py-3 rounded-xl text-left hover:bg-muted/20 transition-colors"
            >
              <div className="grid place-items-center h-9 w-9 rounded-lg bg-muted/30 text-muted-foreground shrink-0">
                <LogOut className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold">Sign out</div>
                <div className="text-[11.5px] text-muted-foreground">
                  Logs you out of seller.getx.live only
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <a
              href={`${process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'}/profile/settings`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-3 sm:px-4 py-3 rounded-xl text-left hover:bg-error/8 transition-colors group"
            >
              <div className="grid place-items-center h-9 w-9 rounded-lg bg-error/12 text-error shrink-0">
                <Trash2 className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-error">Delete account</div>
                <div className="text-[11.5px] text-muted-foreground">
                  Permanently removes your store, listings, and order history.
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-error transition-colors" />
            </a>
          </Section>
        </motion.div>
      </motion.div>

      {/* ── STICKY SAVE BAR ──────────────────────────────────────────── */}
      {editing && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/90 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
        >
          <div className="px-4 sm:px-6 lg:px-10 max-w-4xl mx-auto flex items-center gap-3 flex-wrap">
            <div className="hidden sm:flex items-center gap-2 text-[12px]">
              <Pencil className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">Editing profile</span>
              {dirty && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/12 text-accent font-mono text-[10px] uppercase tracking-wider font-bold">
                  Unsaved
                </span>
              )}
            </div>
            <div className="flex-1 sm:flex-initial sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => {
                  setForm(baseline);
                  setEditing(false);
                }}
                className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-muted/25 hover:bg-muted/40 ring-1 ring-border text-[12.5px] font-semibold transition-colors"
              >
                Discard
              </motion.button>
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={handleSave}
                disabled={!dirty || update.isPending}
                className="
                  flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full
                  bg-gradient-to-b from-primary to-primary-hover
                  text-primary-foreground text-[13px] font-bold tracking-tight
                  shadow-[0_8px_22px_-4px_hsl(var(--primary)/0.55)]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                  transition-all
                "
              >
                {update.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save changes
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </SellerShell>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  HERO IDENTITY CARD                                                  */
/* ══════════════════════════════════════════════════════════════════ */
function HeroIdentity({
  initials,
  avatar,
  name,
  handle,
  country,
  verifiedTier,
  rating,
  totalSales,
  memberSince,
  kycApproved,
  emailVerified,
}: {
  initials: string;
  avatar: string | null;
  name: string | null;
  handle: string;
  country: string;
  verifiedTier: string | null;
  rating: number;
  totalSales: number;
  memberSince: Date | null;
  kycApproved: boolean;
  emailVerified: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/12 via-surface to-accent/6 ring-1 ring-primary/20 p-6 lg:p-8">
      <motion.div
        aria-hidden
        className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="relative shrink-0">
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-gradient-to-br from-primary/35 to-accent/35 grid place-items-center text-foreground font-display font-black text-3xl ring-4 ring-surface shadow-[0_12px_28px_-8px_hsl(var(--primary)/0.4)]">
            {avatar ? (
              // SAP-CRIT-020: referrerPolicy prevents IP/UA tracking via attacker-controlled URLs
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              initials
            )}
          </div>
          {kycApproved && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.3 }}
              className="absolute -bottom-1 -right-1 grid place-items-center h-9 w-9 rounded-full bg-success text-success-foreground ring-4 ring-surface"
              title="Identity verified"
            >
              <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
            </motion.div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {verifiedTier && <TierBadge tier={verifiedTier} />}
            {kycApproved && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 ring-1 ring-success/25 text-success font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold">
                <BadgeCheck className="h-3 w-3" strokeWidth={2.5} />
                Verified
              </span>
            )}
            {emailVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono tracking-[0.18em] text-muted-foreground font-bold">
                <Mail className="h-3 w-3" strokeWidth={2.5} />
                Email
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight">
            {name ?? 'Your name'}
          </h2>
          <div className="font-mono text-[11px] text-muted-foreground mt-0.5">{handle}</div>

          <div className="mt-4 grid grid-cols-3 gap-4 max-w-sm">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Star className="h-3.5 w-3.5 text-accent fill-current" strokeWidth={2.25} />
                <span className="font-display font-extrabold text-[18px] tabular-nums leading-none">
                  {rating > 0 ? rating.toFixed(2) : '—'}
                </span>
              </div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
                Rating
              </div>
            </div>
            <div className="border-l border-border pl-4">
              <div className="font-display font-extrabold text-[18px] tabular-nums leading-none mb-0.5">
                {totalSales}
              </div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
                Sales
              </div>
            </div>
            <div className="border-l border-border pl-4">
              <div className="font-display font-extrabold text-[18px] leading-none mb-0.5">
                {memberSince
                  ? memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—'}
              </div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
                Member
              </div>
            </div>
          </div>

          {country && (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
              {country}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  TIER BADGE                                                          */
/* ══════════════════════════════════════════════════════════════════ */
function TierBadge({ tier }: { tier: string }) {
  const meta: Record<string, { bg: string; ring: string; icon: typeof Crown }> = {
    BASIC: { bg: 'from-primary/35 to-primary/15', ring: 'ring-primary/30', icon: Shield },
    PRO: { bg: 'from-accent/40 to-accent/15', ring: 'ring-accent/35', icon: Trophy },
    ELITE: { bg: 'from-hot/40 to-hot/15', ring: 'ring-hot/35', icon: Crown },
  };
  const key = tier.toUpperCase();
  const m = meta[key] ?? meta.BASIC;
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${m.bg} ring-1 ${m.ring} font-mono text-[10px] uppercase tracking-[0.22em] font-bold text-foreground`}
    >
      <Icon className="h-3 w-3 fill-current" strokeWidth={2.5} />
      {key} tier
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  KYC CARD                                                            */
/* ══════════════════════════════════════════════════════════════════ */
type KycStatusKey = 'NONE' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED' | string;

function KycCard({
  status,
  submittedAt,
  verifiedAt,
  rejectionReason,
  onStart,
  starting,
}: {
  status: KycStatusKey;
  submittedAt: string | null | undefined;
  verifiedAt: string | null | undefined;
  rejectionReason: string | null | undefined;
  onStart: () => void;
  starting: boolean;
}) {
  const stage =
    status === 'VERIFIED' ? 3 : status === 'IN_REVIEW' ? 2 : status === 'REJECTED' ? 1 : 0;

  return (
    <div className="rounded-3xl bg-surface ring-1 ring-border overflow-hidden">
      <KycBanner status={status} verifiedAt={verifiedAt} rejectionReason={rejectionReason} />

      <div className="p-5 sm:p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-3">
          Verification progress
        </div>
        <div className="relative mb-5">
          <div className="absolute left-0 right-0 top-4 h-[3px] rounded-full bg-foreground/8" aria-hidden />
          <motion.div
            className="absolute left-0 top-4 h-[3px] rounded-full bg-gradient-to-r from-success to-success"
            initial={{ width: 0 }}
            animate={{ width: `${(stage / 3) * 100}%` }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
            aria-hidden
          />
          <div className="relative grid grid-cols-3 gap-2">
            <KycStep idx={1} label="Submit ID" active={stage >= 1} done={stage > 1} />
            <KycStep
              idx={2}
              label="Sumsub review"
              active={stage >= 2}
              done={stage > 2}
              spinning={status === 'IN_REVIEW'}
            />
            <KycStep idx={3} label="Verified" active={stage >= 3} done={stage >= 3} />
          </div>
        </div>

        <KycAction
          status={status}
          submittedAt={submittedAt}
          onStart={onStart}
          starting={starting}
        />

        <div className="mt-4 pt-4 border-t border-border flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            KYC is a one-time check via Sumsub. It unlocks withdrawals, lifts listing caps, and
            shows the green &ldquo;Verified&rdquo; badge to buyers — which converts 2× better.
          </span>
        </div>
      </div>
    </div>
  );
}

function KycBanner({
  status,
  verifiedAt,
  rejectionReason,
}: {
  status: KycStatusKey;
  verifiedAt: string | null | undefined;
  rejectionReason: string | null | undefined;
}) {
  if (status === 'VERIFIED') {
    return (
      <div className="bg-gradient-to-r from-success/20 via-success/8 to-transparent px-5 sm:px-6 py-4 flex items-center gap-3">
        <div className="grid place-items-center h-11 w-11 rounded-2xl bg-success/20 text-success ring-1 ring-success/30">
          <BadgeCheck className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-display font-bold text-[15px]">Identity verified</div>
          <div className="text-[12px] text-muted-foreground">
            {verifiedAt
              ? `Approved ${new Date(verifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : 'You’re fully verified.'}
          </div>
        </div>
      </div>
    );
  }
  if (status === 'IN_REVIEW') {
    return (
      <div className="bg-gradient-to-r from-warning/18 via-warning/8 to-transparent px-5 sm:px-6 py-4 flex items-center gap-3">
        <div className="grid place-items-center h-11 w-11 rounded-2xl bg-warning/15 text-warning ring-1 ring-warning/25">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-display font-bold text-[15px]">Under review</div>
          <div className="text-[12px] text-muted-foreground">
            Sumsub is checking your documents. Usually within 24 hours.
          </div>
        </div>
      </div>
    );
  }
  if (status === 'REJECTED') {
    return (
      <div className="bg-gradient-to-r from-error/18 via-error/8 to-transparent px-5 sm:px-6 py-4 flex items-start gap-3">
        <div className="grid place-items-center h-11 w-11 rounded-2xl bg-error/15 text-error ring-1 ring-error/25 shrink-0">
          <AlertTriangle className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[15px]">Verification rejected</div>
          <div className="text-[12px] text-muted-foreground">
            {rejectionReason ?? 'We couldn’t verify your documents. Retry with a clearer photo.'}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-gradient-to-r from-accent/12 via-accent/4 to-transparent px-5 sm:px-6 py-4 flex items-center gap-3">
      <div className="grid place-items-center h-11 w-11 rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/25">
        <Sparkles className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div>
        <div className="font-display font-bold text-[15px]">Verify your identity</div>
        <div className="text-[12px] text-muted-foreground">
          Takes about 3 minutes. Required before you can withdraw earnings.
        </div>
      </div>
    </div>
  );
}

function KycStep({
  idx,
  label,
  active,
  done,
  spinning,
}: {
  idx: number;
  label: string;
  active: boolean;
  done: boolean;
  spinning?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        whileHover={{ scale: 1.08 }}
        transition={{ type: 'spring', stiffness: 380, damping: 16 }}
        className={`
          grid place-items-center h-8 w-8 rounded-full font-bold text-[12px] tabular-nums transition-all
          ${
            done
              ? 'bg-success text-success-foreground ring-4 ring-background'
              : active
                ? 'bg-primary text-primary-foreground ring-4 ring-primary/15'
                : 'bg-muted/40 text-muted-foreground ring-4 ring-background'
          }
        `}
      >
        {done ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : spinning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          idx
        )}
      </motion.div>
      <div
        className={`mt-2 text-[11.5px] font-semibold ${
          active ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </div>
    </div>
  );
}

function KycAction({
  status,
  submittedAt,
  onStart,
  starting,
}: {
  status: KycStatusKey;
  submittedAt: string | null | undefined;
  onStart: () => void;
  starting: boolean;
}) {
  if (status === 'VERIFIED') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-success/8 ring-1 ring-success/20 px-4 py-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2.5} />
          <span className="text-[13px] font-semibold">
            All good — your wallet is unlocked for payouts.
          </span>
        </div>
        <Link
          href="/wallet"
          className="inline-flex items-center gap-1 h-9 px-3.5 rounded-full bg-success text-success-foreground text-[12px] font-bold hover:opacity-90 transition-opacity"
        >
          Open wallet
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }
  if (status === 'IN_REVIEW') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-muted/20 ring-1 ring-border px-4 py-3">
        <Clock className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
        <span className="text-[12.5px] text-muted-foreground">
          Submitted{' '}
          {submittedAt
            ? new Date(submittedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'recently'}
          . We&apos;ll email you the moment it&apos;s done.
        </span>
      </div>
    );
  }
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      type="button"
      onClick={onStart}
      disabled={starting}
      className="
        inline-flex items-center gap-1.5 h-11 px-5 rounded-full
        bg-gradient-to-b from-accent to-accent-hover
        text-accent-foreground text-[13px] font-bold
        shadow-[0_8px_22px_-4px_hsl(var(--accent)/0.55)]
        hover:shadow-[0_12px_30px_-4px_hsl(var(--accent)/0.65)]
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all
      "
    >
      {starting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Opening Sumsub…
        </>
      ) : (
        <>
          <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
          {status === 'REJECTED' ? 'Retry verification' : 'Start KYC'}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </>
      )}
    </motion.button>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  SECTION + ROWS                                                      */
/* ══════════════════════════════════════════════════════════════════ */
function Section({
  title,
  hint,
  icon: Icon,
  tone = 'default',
  children,
}: {
  title: string;
  hint?: string;
  icon: typeof Globe2;
  tone?: 'default' | 'muted';
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-3xl ring-1 overflow-hidden ${
        tone === 'muted' ? 'bg-muted/15 ring-border' : 'bg-surface ring-border'
      }`}
    >
      <div className="px-5 sm:px-6 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="font-display font-bold text-[15px] leading-tight">{title}</h3>
            {hint && <div className="text-[11.5px] text-muted-foreground mt-0.5">{hint}</div>}
          </div>
        </div>
      </div>
      <div className="px-2 sm:px-3 pb-2 space-y-0.5">{children}</div>
    </div>
  );
}

function ReadonlyRow({
  icon: Icon,
  label,
  value,
  verified,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl">
      <div className="grid place-items-center h-9 w-9 rounded-lg bg-muted/30 text-muted-foreground shrink-0">
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase font-mono tracking-[0.18em] text-muted-foreground font-bold">
          {label}
        </div>
        <div className="text-[13.5px] text-foreground truncate">{value}</div>
      </div>
      {verified && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/12 text-success font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold">
          <BadgeCheck className="h-3 w-3" strokeWidth={2.5} />
          Verified
        </span>
      )}
    </div>
  );
}

function FormRow({
  icon: Icon,
  label,
  value,
  edit,
  onChange,
  placeholder,
  prefix,
  max,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  edit: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl">
      <div className="grid place-items-center h-9 w-9 rounded-lg bg-muted/30 text-muted-foreground shrink-0">
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase font-mono tracking-[0.18em] text-muted-foreground font-bold mb-1">
          {label}
        </div>
        {edit ? (
          <div className="relative">
            {prefix && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px] pointer-events-none">
                {prefix}
              </span>
            )}
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              maxLength={max}
              className={`h-9 text-[13px] ${prefix ? 'pl-7' : ''}`}
            />
          </div>
        ) : (
          <div
            className={`text-[13.5px] truncate ${value === '—' ? 'text-muted-foreground' : 'text-foreground'}`}
          >
            {prefix && value !== '—' ? `${prefix}${value}` : value}
          </div>
        )}
      </div>
    </div>
  );
}

function FormRowMulti({
  icon: Icon,
  label,
  value,
  edit,
  onChange,
  placeholder,
  max,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  edit: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
}) {
  return (
    <div className="flex items-start gap-3 px-3 sm:px-4 py-3 rounded-xl">
      <div className="grid place-items-center h-9 w-9 rounded-lg bg-muted/30 text-muted-foreground shrink-0">
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase font-mono tracking-[0.18em] text-muted-foreground font-bold">
            {label}
          </span>
          {edit && max && (
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {value.length} / {max}
            </span>
          )}
        </div>
        {edit ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={max}
            rows={3}
            className="w-full rounded-lg bg-muted/15 ring-1 ring-border focus:bg-surface focus:ring-primary/35 px-3 py-2 text-[13px] outline-none transition-all resize-none"
          />
        ) : (
          <div
            className={`text-[13.5px] ${value === '—' ? 'text-muted-foreground' : 'text-foreground'}`}
          >
            {value}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  hint,
  href,
  external,
  soon,
}: {
  icon: typeof Lock;
  label: string;
  hint?: string;
  href?: string;
  external?: boolean;
  soon?: boolean;
}) {
  const content = (
    <>
      <div className="grid place-items-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold">{label}</div>
        {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
      </div>
      {soon ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/30 ring-1 ring-border font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
          Soon
        </span>
      ) : external ? (
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </>
  );

  if (!href || soon) {
    return (
      <div className="flex items-center gap-3 w-full px-3 sm:px-4 py-3 rounded-xl opacity-70 cursor-not-allowed">
        {content}
      </div>
    );
  }
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex items-center gap-3 w-full px-3 sm:px-4 py-3 rounded-xl hover:bg-muted/20 transition-colors"
    >
      {content}
    </a>
  );
}
