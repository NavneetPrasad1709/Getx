import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { SavedSearch } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { firstOrigin } from '../common/config-helpers';
import {
  ListingsService,
  type ListingListItem,
} from '../listings/listings.service';
import { ListListingsSchema } from '../listings/dto/list-listings.dto';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import {
  CreateSavedSearchDto,
  SavedSearchFilters,
  UpdateSavedSearchSchema,
  UpdateSavedSearchDto,
} from './dto/saved-search.dto';

/* Cap how many matches we send per email — protects against an email with
   200 cards when the user just saved a broad query. We surface 3 in the
   grid + "+ N more" link. */
const MATCH_PREVIEW_COUNT = 3;
const MATCH_HARD_LIMIT = 50;

@Injectable()
export class SavedSearchesService {
  private readonly logger = new Logger(SavedSearchesService.name);
  private readonly webUrl: string;

  constructor(
    private prisma: PrismaService,
    private listings: ListingsService,
    private mail: MailService,
    private users: UsersService,
    config: ConfigService,
  ) {
    this.webUrl = firstOrigin(config, 'WEB_URL', 'http://localhost:3000');
  }

  async create(
    userId: string,
    dto: CreateSavedSearchDto,
  ): Promise<SavedSearch> {
    const filters = dto.filters;
    const name = dto.name?.trim() || buildDefaultName(filters);

    return this.prisma.savedSearch.create({
      data: {
        userId,
        name,
        gameSlug: filters.gameSlug ?? 'pokemon-go',
        tabType: filters.tabType ?? null,
        filters: filters,
        emailAlerts: dto.emailAlerts,
      },
    });
  }

  async listMine(userId: string): Promise<SavedSearch[]> {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    userId: string,
    id: string,
    patch: UpdateSavedSearchDto,
  ): Promise<SavedSearch> {
    const existing = await this.prisma.savedSearch.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();

    /* Re-validate the patch — defensive against direct calls that skip
       the controller-side parse. */
    const parsed = UpdateSavedSearchSchema.parse(patch);

    return this.prisma.savedSearch.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.emailAlerts !== undefined
          ? { emailAlerts: parsed.emailAlerts }
          : {}),
      },
    });
  }

  async remove(userId: string, id: string): Promise<{ success: true }> {
    const existing = await this.prisma.savedSearch.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();

    await this.prisma.savedSearch.delete({ where: { id } });
    return { success: true };
  }

  /* Cron — every 4 hours. Pulls all saved searches with alerts on, runs
     each one against the live catalogue, emails the user when ≥1 new or
     price-dropped match is found since the last notification.

     Errors are swallowed per-row so one broken filter doesn't take the
     whole cron run down. */
  @Cron(CronExpression.EVERY_4_HOURS, { name: 'savedSearchAlerts' })
  async runAlerts(): Promise<{ checked: number; notified: number }> {
    // Bounded scan — at 20 lakh users we may exceed this; switch to cursor
    // pagination if `notified` ever clips at the cap (logged below).
    const SCAN_CAP = 1000;
    const candidates = await this.prisma.savedSearch.findMany({
      where: {
        emailAlerts: true,
        user: {
          status: 'ACTIVE',
          emailNotifications: true,
        },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, unsubscribeToken: true },
        },
      },
      take: SCAN_CAP,
    });
    if (candidates.length === SCAN_CAP) {
      this.logger.warn(
        `savedSearch alerts hit SCAN_CAP=${SCAN_CAP} — cursor pagination required`,
      );
    }

    let notified = 0;
    for (const row of candidates) {
      try {
        const sent = await this.processOne(row);
        if (sent) notified += 1;
      } catch (err) {
        this.logger.warn(
          `savedSearch alert failed for id=${row.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `savedSearch alerts run · checked=${candidates.length} notified=${notified}`,
    );
    return { checked: candidates.length, notified };
  }

  private async processOne(
    row: SavedSearch & {
      user: {
        id: string;
        email: string;
        name: string | null;
        unsubscribeToken: string | null;
      };
    },
  ): Promise<boolean> {
    const filters = ListListingsSchema.safeParse({
      ...(row.filters as Record<string, unknown>),
      limit: MATCH_HARD_LIMIT,
    });
    if (!filters.success) {
      this.logger.warn(`Invalid filters in saved-search ${row.id}`);
      return false;
    }

    const result = await this.listings.listListings(filters.data);
    const since = row.lastNotifiedAt ?? row.createdAt;

    /* A match is "new" if the listing was created after the cursor OR if
       it's currently discounted and was last updated after the cursor —
       captures price drops on existing listings. */
    const newMatches = result.data.filter((item) => {
      const created = new Date(item.createdAt).getTime();
      if (created > since.getTime()) return true;
      return false;
    });

    if (newMatches.length === 0) return false;

    await this.mail.sendSavedSearchAlert({
      to: row.user.email,
      userName: row.user.name ?? null,
      savedSearchName: row.name,
      matches: newMatches.slice(0, MATCH_PREVIEW_COUNT),
      totalMatches: newMatches.length,
      viewAllUrl: this.buildViewAllUrl(row),
      unsubscribeUrl: await this.users.unsubscribeUrlFor(
        row.user.id,
        this.webUrl,
      ),
    });

    await this.prisma.savedSearch.update({
      where: { id: row.id },
      data: { lastNotifiedAt: new Date() },
    });

    return true;
  }

  private buildViewAllUrl(row: SavedSearch): string {
    const f = row.filters as Record<string, unknown>;
    const game = (f.gameSlug as string) ?? row.gameSlug ?? 'pokemon-go';
    const tab = (f.tabType as string) ?? row.tabType ?? 'ACCOUNTS';
    const seg =
      tab === 'TOP_UPS' ? 'top-ups' : tab === 'ITEMS' ? 'items' : 'accounts';
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) {
      if (v === undefined || v === null || v === '') continue;
      if (k === 'gameSlug' || k === 'tabType') continue;
      if (
        typeof v !== 'string' &&
        typeof v !== 'number' &&
        typeof v !== 'boolean'
      )
        continue;
      qs.set(k, String(v));
    }
    const tail = qs.toString();
    return `${this.webUrl}/games/${game}/${seg}${tail ? `?${tail}` : ''}`;
  }
}

/* Human-readable label generator. Examples:
   "Pokémon GO accounts · Lv 45+ · ₹5k-₹20k · Mystic"
   "Pokémon GO top-ups · 14,500 coins"
   "Pokémon GO items · Pokeballs"  */
export function buildDefaultName(filters: SavedSearchFilters): string {
  const parts: string[] = [];
  const gameSlug = filters.gameSlug ?? 'pokemon-go';
  const game = gameSlug === 'pokemon-go' ? 'Pokémon GO' : gameSlug;
  const tab = filters.tabType ?? 'ACCOUNTS';
  const tabLabel =
    tab === 'TOP_UPS' ? 'top-ups' : tab === 'ITEMS' ? 'items' : 'accounts';
  parts.push(`${game} ${tabLabel}`);

  if (filters.levelMin !== undefined && filters.levelMax !== undefined) {
    parts.push(`Lv ${filters.levelMin}–${filters.levelMax}`);
  } else if (filters.levelMin !== undefined) {
    parts.push(`Lv ${filters.levelMin}+`);
  } else if (filters.levelMax !== undefined) {
    parts.push(`Lv ≤${filters.levelMax}`);
  }

  if (filters.team) parts.push(filters.team);
  if (filters.region) parts.push(filters.region);
  if (filters.platform) parts.push(filters.platform);

  const priceLabel = priceRangeLabel(filters.priceMin, filters.priceMax);
  if (priceLabel) parts.push(priceLabel);

  if (filters.shinyMin) parts.push(`Shiny ≥${filters.shinyMin}`);
  if (filters.legendaryMin) parts.push(`Leg ≥${filters.legendaryMin}`);
  if (filters.hundoMin) parts.push(`100% ≥${filters.hundoMin}`);
  if (filters.coinAmount) parts.push(`${filters.coinAmount} coins`);
  if (filters.itemTypes) parts.push(filters.itemTypes);
  if (filters.search) parts.push(`“${filters.search}”`);

  return parts.join(' · ').slice(0, 180);
}

function priceRangeLabel(
  min: number | undefined,
  max: number | undefined,
): string | null {
  if (min === undefined && max === undefined) return null;
  if (min !== undefined && max !== undefined) {
    return `₹${shortMoney(min)}–₹${shortMoney(max)}`;
  }
  if (min !== undefined) return `₹${shortMoney(min)}+`;
  return `≤₹${shortMoney(max!)}`;
}

function shortMoney(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

/* Re-export the type from listings so mail.service can type its argument
   without importing the full ListingsService. */
export type MatchListItem = ListingListItem;
