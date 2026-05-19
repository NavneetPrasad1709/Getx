'use client';

import * as React from 'react';
import Image from 'next/image';
import { AxiosError } from 'axios';
import { Camera, User as UserIcon, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Textarea, Skeleton, toast } from '@getx/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useUploadImage } from '@/hooks/use-upload';
import { useProfileUpdate } from '@/hooks/use-profile-update';
import { useLoyalty } from '@/hooks/use-loyalty';
import { ProfileCompletionNudge } from '@/components/profile/completion-nudge';

/* Profile settings subpage — rendered inside the settings sidebar shell.

   We can't read the full profile (displayName / bio / website / socials /
   timezone) off `useAuth().user` because the AuthUser type is narrower
   than the underlying /auth/me payload. Instead we re-fetch the public
   profile by username via `GET /users/by-username/{username}` — that
   endpoint returns every field this form touches and works for the
   buyer's own profile. The form initializes from that fresh read so a
   navigate-away-then-back always shows the canonical server state. */

interface ProfileSnapshot {
  id: string;
  username: string;
  name: string | null;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  website: string | null;
  twitterHandle: string | null;
  discordHandle: string | null;
  youtubeHandle: string | null;
  twitchHandle: string | null;
  /* The by-username payload doesn't carry preferredLanguages /
     timezone; both are private-only fields. We default them to safe
     blanks and only PATCH the keys the form actually changed. */
}

/* useAuth().user is typed without `username`, but the underlying
   /auth/me response does include it. Read the raw shape with a safe cast
   to pick up the username without widening the global AuthUser type. */
type WithUsername = { username?: string | null };

export default function SettingsProfilePage() {
  const { user } = useAuth();
  const username = (user as (typeof user & WithUsername) | null)?.username ?? null;

  const profileQuery = useQuery<ProfileSnapshot>({
    queryKey: ['user-profile', username],
    queryFn: async () => {
      if (!username) throw new Error('Missing username');
      const { data } = await api.get<ProfileSnapshot>(
        `/users/by-username/${encodeURIComponent(username)}`,
      );
      return data;
    },
    enabled: !!username,
    staleTime: 30_000,
  });

  if (!user || profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        Couldn’t load your profile. Refresh the page to try again.
      </div>
    );
  }

  return (
    <ProfileForm snapshot={profileQuery.data} refetch={profileQuery.refetch} />
  );
}

function ProfileForm({
  snapshot,
  refetch,
}: {
  snapshot: ProfileSnapshot;
  refetch: () => Promise<unknown>;
}) {
  const { refetch: refetchAuth } = useAuth();
  const upload = useUploadImage();
  const update = useProfileUpdate();
  /* Loyalty ledger powers the "already earned" check for the bonus
     nudge — once an EARNED_PROFILE_COMPLETE row exists we never nag
     again. */
  const { data: loyalty } = useLoyalty(true);
  const alreadyEarned = !!loyalty?.ledger.some(
    (t) => t.type === 'EARNED_PROFILE_COMPLETE',
  );

  const [avatar, setAvatar] = React.useState<string | null>(snapshot.avatar);
  const [displayName, setDisplayName] = React.useState<string>(
    snapshot.displayName ?? '',
  );
  const [bio, setBio] = React.useState<string>(snapshot.bio ?? '');
  const [website, setWebsite] = React.useState<string>(snapshot.website ?? '');
  const [twitter, setTwitter] = React.useState<string>(
    snapshot.twitterHandle ?? '',
  );
  const [discord, setDiscord] = React.useState<string>(
    snapshot.discordHandle ?? '',
  );
  const [youtube, setYoutube] = React.useState<string>(
    snapshot.youtubeHandle ?? '',
  );
  const [twitch, setTwitch] = React.useState<string>(
    snapshot.twitchHandle ?? '',
  );
  const [timezone, setTimezone] = React.useState<string>('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /* Compare each field against its snapshot value; only PATCH the keys
     that actually changed. Trim before compare so trailing whitespace
     doesn't trigger a no-op save. */
  const dirty = React.useMemo(() => {
    if ((avatar ?? null) !== (snapshot.avatar ?? null)) return true;
    if (displayName.trim() !== (snapshot.displayName ?? '')) return true;
    if (bio !== (snapshot.bio ?? '')) return true;
    if (website.trim() !== (snapshot.website ?? '')) return true;
    if (twitter.trim() !== (snapshot.twitterHandle ?? '')) return true;
    if (discord.trim() !== (snapshot.discordHandle ?? '')) return true;
    if (youtube.trim() !== (snapshot.youtubeHandle ?? '')) return true;
    if (twitch.trim() !== (snapshot.twitchHandle ?? '')) return true;
    if (timezone.trim() !== '') return true;
    return false;
  }, [
    avatar,
    displayName,
    bio,
    website,
    twitter,
    discord,
    youtube,
    twitch,
    timezone,
    snapshot,
  ]);

  const onPickAvatar = () => fileInputRef.current?.click();

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar must be 5 MB or smaller');
      return;
    }
    try {
      const result = await upload.mutateAsync(file);
      setAvatar(result.url);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Upload failed — try a different image');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;

    /* Build the partial payload — only include keys whose value differs
       from the snapshot, and normalize empty strings to `null` so the
       server clears the column instead of storing whitespace. */
    const payload: Record<string, unknown> = {};
    const toNullable = (v: string) => {
      const t = v.trim();
      return t === '' ? null : t;
    };

    if ((avatar ?? null) !== (snapshot.avatar ?? null)) payload.avatar = avatar;
    if (displayName.trim() !== (snapshot.displayName ?? ''))
      payload.displayName = toNullable(displayName);
    if (bio !== (snapshot.bio ?? '')) payload.bio = toNullable(bio);
    if (website.trim() !== (snapshot.website ?? ''))
      payload.website = toNullable(website);
    if (twitter.trim() !== (snapshot.twitterHandle ?? ''))
      payload.twitterHandle = toNullable(twitter);
    if (discord.trim() !== (snapshot.discordHandle ?? ''))
      payload.discordHandle = toNullable(discord);
    if (youtube.trim() !== (snapshot.youtubeHandle ?? ''))
      payload.youtubeHandle = toNullable(youtube);
    if (twitch.trim() !== (snapshot.twitchHandle ?? ''))
      payload.twitchHandle = toNullable(twitch);
    if (timezone.trim() !== '') payload.timezone = toNullable(timezone);

    try {
      await update.mutateAsync(payload);
      toast.success('Profile saved');
      await Promise.all([refetch(), refetchAuth()]);
      setTimezone('');
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not save profile');
    }
  };

  /* Live gates — render against the working form state so the checklist
     updates the moment the buyer types a 20th bio character. */
  const hasBio = bio.trim().length >= 20;
  const hasAvatar = !!avatar && avatar.length > 0;
  const hasSocial = !!(
    twitter.trim() ||
    discord.trim() ||
    youtube.trim() ||
    twitch.trim() ||
    website.trim()
  );

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <ProfileCompletionNudge
        hasBio={hasBio}
        hasAvatar={hasAvatar}
        hasSocial={hasSocial}
        alreadyEarned={alreadyEarned}
      />
      <p className="text-[14px] text-muted-foreground max-w-xl">
        How you appear across GETX — your name, photo, bio, and social
        handles. These show on your public profile and seller storefront.
      </p>

      {/* Avatar */}
      <section className="rounded-3xl border border-border/60 bg-surface/60 p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <button
              type="button"
              onClick={onPickAvatar}
              disabled={upload.isPending}
              aria-label="Change avatar"
              className="group relative h-20 w-20 rounded-full overflow-hidden border-2 border-border bg-[hsl(var(--surface-elevated))] grid place-items-center"
            >
              {avatar ? (
                <Image
                  src={avatar}
                  alt="Your avatar"
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <UserIcon className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white text-[11px] font-semibold gap-1">
                {upload.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Change
                  </>
                )}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onAvatarChange}
              className="hidden"
            />
          </div>
          <div className="min-w-0">
            <div className="font-display text-[14px] font-extrabold mb-1">
              Profile photo
            </div>
            <div className="text-[12px] text-muted-foreground">
              PNG, JPG or WebP. Max 5 MB. Square images look best.
            </div>
            <button
              type="button"
              onClick={onPickAvatar}
              disabled={upload.isPending}
              className="mt-2 text-[12px] font-semibold text-[hsl(var(--primary))] hover:underline disabled:opacity-50"
            >
              {upload.isPending ? 'Uploading…' : 'Upload new photo'}
            </button>
          </div>
        </div>
      </section>

      {/* Display name */}
      <Field
        label="Display name"
        hint="Up to 60 characters. Shown on your public profile."
      >
        <Input
          value={displayName}
          maxLength={60}
          placeholder={snapshot.name ?? 'How should we call you?'}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>

      {/* Bio */}
      <Field
        label="Bio"
        hint={`${bio.length}/500 characters`}
      >
        <Textarea
          value={bio}
          maxLength={500}
          rows={4}
          placeholder="Tell buyers a bit about you, your games, and what you sell."
          onChange={(e) => setBio(e.target.value)}
        />
      </Field>

      {/* Website */}
      <Field label="Website" hint="Full URL including https://">
        <Input
          type="url"
          value={website}
          placeholder="https://yoursite.com"
          onChange={(e) => setWebsite(e.target.value)}
        />
      </Field>

      {/* Socials */}
      <section>
        <div className="font-display text-[13px] font-extrabold mb-1">
          Social handles
        </div>
        <p className="text-[12px] text-muted-foreground mb-3">
          Username only — no full URLs. Shown on your seller storefront.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <SocialInput
            label="Twitter / X"
            value={twitter}
            onChange={setTwitter}
            placeholder="username"
          />
          <SocialInput
            label="Discord"
            value={discord}
            onChange={setDiscord}
            placeholder="username"
          />
          <SocialInput
            label="YouTube"
            value={youtube}
            onChange={setYoutube}
            placeholder="channel"
          />
          <SocialInput
            label="Twitch"
            value={twitch}
            onChange={setTwitch}
            placeholder="channel"
          />
        </div>
      </section>

      {/* Timezone */}
      <Field
        label="Timezone"
        hint="IANA timezone — e.g. America/New_York, Asia/Kolkata"
      >
        <Input
          value={timezone}
          placeholder="America/New_York"
          onChange={(e) => setTimezone(e.target.value)}
        />
      </Field>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <span className="text-[12px] text-muted-foreground">
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
        <Button
          type="submit"
          disabled={!dirty || update.isPending}
          loading={update.isPending}
          loadingText="Saving…"
          className="rounded-full"
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <label className="block font-display text-[13px] font-extrabold mb-1">
        {label}
      </label>
      {hint ? (
        <p className="text-[12px] text-muted-foreground mb-2">{hint}</p>
      ) : null}
      {children}
    </section>
  );
}

function SocialInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-foreground mb-1.5">
        {label}
      </label>
      <div className="flex items-stretch rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background overflow-hidden">
        <span className="grid place-items-center px-3 text-[13px] font-semibold text-muted-foreground bg-[hsl(var(--surface-elevated))] border-r border-input select-none">
          @
        </span>
        <input
          type="text"
          value={value}
          maxLength={40}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex h-9 w-full bg-transparent px-3 py-1 text-[14px] outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
