import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { firstOrigin } from '../common/config-helpers';

/* StripeConnectService — Express seller-onboarding wrapper.

   Lifecycle:
     1. Seller hits POST /payouts/connect/start
        → if no acct_xxx yet, create an Express account scoped to the
          seller's email + country
        → mint a fresh AccountLink (one-shot URL valid ~5 min) and
          return it. UI redirects the seller to Stripe's hosted form.
     2. Seller finishes / partial-completes the form → Stripe redirects
        them back to `?return_url`. We don't trust the redirect — the
        canonical state arrives via `account.updated` webhook.
     3. `chargesEnabled` + `payoutsEnabled` flip true once Stripe has
        verified identity + bank. Until then, withdrawals stay in the
        manual-approval queue. */

const STRIPE_API = 'https://api.stripe.com/v1';

interface StripeAccountResponse {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}

interface StripeAccountLinkResponse {
  url: string;
  expires_at: number;
}

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);
  private readonly secretKey: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private audit: AuditService,
  ) {
    this.secretKey = config.get<string>('STRIPE_SECRET_KEY') ?? '';
    if (!this.secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY missing — Connect runs in MOCK mode (no acct_ created).',
      );
    }
  }

  /* Status — what the seller sees in the UI. Reads the cached fields
     on the User row; the webhook keeps those fresh. */
  async getStatus(userId: string): Promise<{
    accountId: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    onboardedAt: string | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectChargesEnabled: true,
        stripeConnectPayoutsEnabled: true,
        stripeConnectDetailsSubmitted: true,
        stripeConnectOnboardedAt: true,
      },
    });
    if (!user) throw new NotFoundException();
    return {
      accountId: user.stripeConnectAccountId,
      chargesEnabled: user.stripeConnectChargesEnabled,
      payoutsEnabled: user.stripeConnectPayoutsEnabled,
      detailsSubmitted: user.stripeConnectDetailsSubmitted,
      onboardedAt: user.stripeConnectOnboardedAt?.toISOString() ?? null,
    };
  }

  /* Idempotent: returns the existing acct_ if one is already on the
     user row, otherwise creates a fresh Express account. */
  async ensureAccount(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        country: true,
        isSeller: true,
        status: true,
        stripeConnectAccountId: true,
      },
    });
    if (!user) throw new NotFoundException();
    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('Account inactive');
    }
    if (!user.isSeller) {
      throw new BadRequestException(
        'Seller mode must be active before onboarding for payouts',
      );
    }
    if (user.stripeConnectAccountId) return user.stripeConnectAccountId;

    if (!this.secretKey) {
      /* Mock path — create a fake acct_ and persist so the UI can show
         the rest of the onboarding flow against a stable id. */
      const mockId = `acct_mock_${user.id.slice(0, 12)}`;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeConnectAccountId: mockId },
      });
      return mockId;
    }

    const form = new URLSearchParams();
    form.set('type', 'express');
    form.set('country', user.country || 'US');
    form.set('email', user.email);
    form.set('capabilities[card_payments][requested]', 'true');
    form.set('capabilities[transfers][requested]', 'true');
    form.set('metadata[getxUserId]', user.id);

    const resp = await fetch(`${STRIPE_API}/accounts`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: form.toString(),
    });
    if (!resp.ok) {
      const text = await resp.text();
      this.logger.error(`Stripe Connect account create failed: ${text}`);
      throw new BadRequestException('Failed to create Stripe Connect account');
    }
    const data = (await resp.json()) as StripeAccountResponse;
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeConnectAccountId: data.id },
    });
    await this.audit.log({
      userId,
      action: 'payouts.connect_account_created',
      entity: 'User',
      entityId: userId,
      metadata: { accountId: data.id, country: user.country },
      severity: 'INFO',
    });
    return data.id;
  }

  /* One-shot onboarding link. Stripe AccountLinks expire after ~5
     minutes; we don't cache them. UI calls this every time the seller
     clicks "Continue onboarding." */
  async createOnboardingLink(
    userId: string,
    returnPath: string,
    refreshPath: string,
  ): Promise<{ url: string; expiresAt: string }> {
    const accountId = await this.ensureAccount(userId);

    if (!this.secretKey) {
      /* Mock — just bounce the seller to the return URL. Lets us click
         through the flow in dev without a real Stripe key. */
      const webUrl = firstOrigin(this.config, 'WEB_URL', 'http://localhost:3000');
      return {
        url: `${webUrl}${returnPath}?mock=1`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
    }

    const webUrl =
      this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const form = new URLSearchParams();
    form.set('account', accountId);
    form.set('refresh_url', `${webUrl}${refreshPath}`);
    form.set('return_url', `${webUrl}${returnPath}`);
    form.set('type', 'account_onboarding');

    const resp = await fetch(`${STRIPE_API}/account_links`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: form.toString(),
    });
    if (!resp.ok) {
      const text = await resp.text();
      this.logger.error(`Stripe Connect account link failed: ${text}`);
      throw new BadRequestException('Failed to create onboarding link');
    }
    const data = (await resp.json()) as StripeAccountLinkResponse;
    return {
      url: data.url,
      expiresAt: new Date(data.expires_at * 1000).toISOString(),
    };
  }

  /* Webhook handler for `account.updated`. Stripe emits this whenever
     capabilities flip — we mirror to the local User row so withdraw
     gating stays accurate. Idempotent. */
  async handleAccountUpdated(account: StripeAccountResponse): Promise<void> {
    if (!account.id) return;
    const user = await this.prisma.user.findUnique({
      where: { stripeConnectAccountId: account.id },
      select: { id: true, stripeConnectOnboardedAt: true },
    });
    if (!user) {
      this.logger.warn(
        `Connect webhook for unknown account ${account.id} — ignoring`,
      );
      return;
    }
    const chargesEnabled = account.charges_enabled === true;
    const payoutsEnabled = account.payouts_enabled === true;
    const detailsSubmitted = account.details_submitted === true;
    /* Record `onboardedAt` once when payouts + charges both light up
       for the first time. Never clear it (a later capability flap
       shouldn't reset the audit). */
    const justOnboarded =
      chargesEnabled &&
      payoutsEnabled &&
      user.stripeConnectOnboardedAt === null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        stripeConnectChargesEnabled: chargesEnabled,
        stripeConnectPayoutsEnabled: payoutsEnabled,
        stripeConnectDetailsSubmitted: detailsSubmitted,
        ...(justOnboarded ? { stripeConnectOnboardedAt: new Date() } : {}),
      },
    });

    if (justOnboarded) {
      await this.audit.log({
        userId: user.id,
        action: 'payouts.connect_onboarded',
        entity: 'User',
        entityId: user.id,
        metadata: { accountId: account.id },
        severity: 'INFO',
      });
    }
  }

  private authHeaders(): Record<string, string> {
    const basic = Buffer.from(`${this.secretKey}:`).toString('base64');
    return {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }
}
