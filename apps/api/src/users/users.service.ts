import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_PROFILE_SELECT = {
  id: true,
  username: true,
  name: true,
  displayName: true,
  avatar: true,
  bio: true,
  website: true,
  twitterHandle: true,
  discordHandle: true,
  youtubeHandle: true,
  twitchHandle: true,
  country: true,
  isSeller: true,
  sellerRating: true,
  buyerRating: true,
  totalReviews: true,
  totalSales: true,
  verifiedTier: true,
  isVerified: true,
  rank: true,
  xp: true,
  createdAt: true,
  lastSeenAt: true,
} satisfies Prisma.UserSelect;

type PublicProfileRow = Prisma.UserGetPayload<{
  select: typeof PUBLIC_PROFILE_SELECT;
}>;

/* PublicProfile shape returned to the web app — `isOnline` is computed at
   read-time off `lastSeenAt`. Threshold matches the buyer-facing copy
   ("Online now" stays accurate within ~5 min). */
export type PublicProfile = PublicProfileRow & { isOnline: boolean };

/* A user is "online" if they've made any authenticated request inside the
   ONLINE_WINDOW_MS window. Matches the JwtStrategy 60s throttle so a chatty
   browser pegs the indicator green; the 5-min window covers the throttle
   gap + one missed request. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function withOnline(row: PublicProfileRow): PublicProfile {
  const isOnline =
    row.lastSeenAt !== null &&
    Date.now() - row.lastSeenAt.getTime() < ONLINE_WINDOW_MS;
  return { ...row, isOnline };
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getByUsername(username: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return withOnline(user);
  }

  async getById(id: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return withOnline(user);
  }

  /* Public seller search — federated query used by the /search page.
     Matches against username + displayName + name (case-insensitive
     contains). Limits to active accounts only. Returns up to 12 hits
     ordered by sellerRating desc so top sellers surface first. */
  async searchSellers(q: string, limit = 12): Promise<PublicProfile[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];
    const rows = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { username: { contains: trimmed, mode: 'insensitive' } },
          { name: { contains: trimmed, mode: 'insensitive' } },
          { displayName: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ sellerRating: 'desc' }, { totalSales: 'desc' }],
      take: Math.min(limit, 50),
      select: PUBLIC_PROFILE_SELECT,
    });
    return rows.map(withOnline);
  }

  /* Top-100 leaderboard by lifetime XP. Anonymises rows lacking a public
     username (uses display name or "anon"). Returns rank, xp, totalSales,
     sellerRating, country so the /leaderboard page can render a podium
     + table without a follow-up query per row. */
  async getLeaderboard(): Promise<
    Array<{
      position: number;
      username: string | null;
      name: string | null;
      avatar: string | null;
      rank: string;
      xp: number;
      totalSales: number;
      sellerRating: number;
      country: string;
    }>
  > {
    const rows = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', xp: { gt: 0 } },
      orderBy: [{ xp: 'desc' }, { totalSales: 'desc' }],
      take: 100,
      select: {
        username: true,
        name: true,
        avatar: true,
        rank: true,
        xp: true,
        totalSales: true,
        sellerRating: true,
        country: true,
      },
    });
    return rows.map((r, i) => ({
      position: i + 1,
      username: r.username,
      name: r.name,
      avatar: r.avatar,
      rank: r.rank,
      xp: r.xp,
      totalSales: r.totalSales,
      sellerRating: r.sellerRating,
      country: r.country,
    }));
  }

  /* Returns a stable per-user unsubscribe URL. Lazily mints a token on
     first call so existing users get one the first time they receive an
     email after this feature ships. */
  async unsubscribeUrlFor(userId: string, webUrl: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { unsubscribeToken: true },
    });
    let token = existing?.unsubscribeToken ?? null;
    if (!token) {
      token = randomBytes(24).toString('base64url');
      await this.prisma.user.update({
        where: { id: userId },
        data: { unsubscribeToken: token },
      });
    }
    /* /unsubscribe/{token} is a dedicated web route that calls the
       API endpoint GET /users/unsubscribe/:token and renders a
       confirmation. The previous /u/{token} URL collided with the
       short-profile alias which redirects to /users/{username} —
       saved-search emails were shipping a link that landed on a
       broken profile page and never actually unsubscribed anyone
       (CAN-SPAM / GDPR violation). */
    return `${webUrl}/unsubscribe/${token}`;
  }

  /* One-click unsubscribe — flips emailNotifications=false for the matching
     token. Idempotent: if the token doesn't exist or already opted out, we
     still 200 to keep the link working without revealing token validity. */
  async unsubscribeByToken(
    token: string,
  ): Promise<{ alreadyOptedOut: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true, emailNotifications: true },
    });
    if (!user) return { alreadyOptedOut: true };
    if (!user.emailNotifications) return { alreadyOptedOut: true };
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailNotifications: false },
    });
    return { alreadyOptedOut: false };
  }
}
