import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Prisma, WalletTransaction } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RankService } from '../rank/rank.service';
import { ApplyWalletDto, WithdrawDto } from './dto/wallet.dto';
import { encryptPii } from '../common/pii-crypto';

/* WalletService — buyer-side GETX Coins ledger.

   The buyer balance lives in User.buyerWallet (a single Float). Every
   credit/debit writes a WalletTransaction row with balanceBefore +
   balanceAfter for full audit. Spend-loop:
     COMPLETED order  → cashback credit (1% of buyerTotal)  via creditCashback()
     PENDING order    → buyer applies wallet credit         via applyToOrder()
     Order cancelled  → refund previously-applied credit    via refundAppliedOnCancel()
     UPI withdraw     → debit + manual approval queue       via withdraw()

   Caps:
     · Apply: amount ≤ min(balance, buyerTotal × 50%)
     · Withdraw: amount ≤ balance, min ₹100

   Cron / atomic guarantees:
     · creditCashback runs inside the order-release Prisma tx
     · applyToOrder runs in its own tx so re-checkout doesn't double-debit  */
const MAX_WALLET_APPLY_PCT = 0.5;
/* Per-method minimum withdraw amounts live in WalletService.withdraw —
   they're rail-specific (UPI=100 INR, PayPal=10 USD, Wise=20 USD,
   Bank=50 USD). */

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getMyWallet(userId: string): Promise<{
    balance: number;
    pendingEarnings: number;
    sellerWallet: number;
    totalEarned: number;
    totalSpent: number;
    ledger: WalletTransaction[];
  }> {
    const [user, ledger] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          buyerWallet: true,
          sellerWallet: true,
          pendingEarnings: true,
          totalEarned: true,
          totalSpent: true,
        },
      }),
      this.prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    if (!user) throw new NotFoundException();
    return {
      balance: user.buyerWallet.toNumber(),
      pendingEarnings: user.pendingEarnings.toNumber(),
      sellerWallet: user.sellerWallet.toNumber(),
      totalEarned: user.totalEarned.toNumber(),
      totalSpent: user.totalSpent.toNumber(),
      ledger,
    };
  }

  /* Apply buyer-wallet credit to a PENDING order. Debits the buyer's
     wallet immediately so concurrent applications can't race. The
     payment flow later subtracts walletApplied from the Razorpay
     amount in PaymentsService.createCheckout. */
  async applyToOrder(
    userId: string,
    dto: ApplyWalletDto,
  ): Promise<{
    walletApplied: number;
    newBalance: number;
    chargeable: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        select: {
          id: true,
          buyerId: true,
          status: true,
          buyerTotal: true,
          currency: true,
          walletApplied: true,
          loyaltyPointsApplied: true,
          orderNumber: true,
        },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.buyerId !== userId) throw new ForbiddenException();
      if (order.status !== 'PENDING') {
        throw new BadRequestException(
          'Wallet credit can only be applied before payment',
        );
      }
      if (order.walletApplied.toNumber() > 0) {
        throw new BadRequestException(
          'Wallet credit already applied — remove it first',
        );
      }
      /* Mutex with loyalty points — only one engagement reward per order
         so the spec stays buyer-friendly (no stacking 50% wallet + 50% pts). */
      if (order.loyaltyPointsApplied > 0) {
        throw new BadRequestException(
          'Loyalty points already applied — remove them before applying GETX Coins',
        );
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { buyerWallet: true },
      });
      if (!user) throw new NotFoundException();

      const cap = order.buyerTotal.toNumber() * MAX_WALLET_APPLY_PCT;
      const maxApplicable = Math.min(user.buyerWallet.toNumber(), cap);
      const applied = Math.min(dto.amount, maxApplicable);
      if (applied <= 0) {
        throw new BadRequestException(
          'Nothing to apply — balance or cap is zero',
        );
      }

      await tx.user.update({
        where: { id: userId },
        data: { buyerWallet: { decrement: applied } },
      });

      // PAY-HIGH-019: re-read AFTER the atomic decrement so balances reflect
      // our specific write, not a stale pre-read that concurrent ops share
      const postUpdate = await tx.user.findUnique({
        where: { id: userId },
        select: { buyerWallet: true },
      });
      const actualAfter = postUpdate?.buyerWallet.toNumber() ?? (user.buyerWallet.toNumber() - applied);
      const actualBefore = actualAfter + applied;

      await tx.order.update({
        where: { id: order.id },
        data: { walletApplied: applied },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'SPEND',
          amount: -applied,
          currency: order.currency,
          orderId: order.id,
          balanceBefore: actualBefore,
          balanceAfter: actualAfter,
          description: `GETX Coins applied to order ${order.orderNumber}`,
          metadata: { orderNumber: order.orderNumber },
        },
      });

      return {
        walletApplied: applied,
        newBalance: actualAfter,
        chargeable: Math.max(0, order.buyerTotal.toNumber() - applied),
      };
    });
  }

  /* Refund a previously-applied wallet credit when an order cancels.
     Idempotent — running it twice on the same order is safe. */
  async refundAppliedOnCancel(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        walletApplied: true,
        currency: true,
        orderNumber: true,
      },
    });
    if (!order || !order.walletApplied || order.walletApplied.toNumber() <= 0) return;

    const user = await tx.user.findUnique({
      where: { id: order.buyerId },
      select: { buyerWallet: true },
    });
    if (!user) return;

    await tx.user.update({
      where: { id: order.buyerId },
      data: { buyerWallet: { increment: order.walletApplied } },
    });
    // PAY-HIGH-019: read balance AFTER increment for accurate ledger
    const postRefund = await tx.user.findUnique({
      where: { id: order.buyerId },
      select: { buyerWallet: true },
    });
    const refundAfter = postRefund?.buyerWallet.toNumber() ?? (user.buyerWallet.toNumber() + order.walletApplied.toNumber());
    const refundBefore = refundAfter - order.walletApplied.toNumber();
    await tx.walletTransaction.create({
      data: {
        userId: order.buyerId,
        type: 'REFUND',
        amount: order.walletApplied,
        currency: order.currency,
        orderId: order.id,
        balanceBefore: refundBefore,
        balanceAfter: refundAfter,
        description: `Refund of wallet credit on cancelled order ${order.orderNumber}`,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { walletApplied: 0 },
    });
  }

  /* Credits rank-tier cashback to the buyer after an order completes.
     Rate scales 1% → 4% by rank (see RankService.cashbackRateFor). The
     buyer's rank is read inside the same tx so a promotion that lands
     between order creation and release still applies the new rate. */
  async creditCashback(
    tx: Prisma.TransactionClient,
    params: {
      buyerId: string;
      orderId: string;
      orderNumber: string;
      buyerTotal: number;
      currency: string;
    },
  ): Promise<number> {
    const buyer = await tx.user.findUnique({
      where: { id: params.buyerId },
      select: { buyerWallet: true, totalSpent: true, rank: true },
    });
    if (!buyer) return 0;

    const rate = RankService.cashbackRateFor(buyer.rank);
    /* Round down so we never round up half-cents. */
    const cashback = Math.floor(params.buyerTotal * rate * 100) / 100;
    if (cashback <= 0) return 0;

    await tx.user.update({
      where: { id: params.buyerId },
      data: {
        buyerWallet: { increment: cashback },
        totalSpent: { increment: params.buyerTotal },
      },
    });
    // PAY-HIGH-019: read balance AFTER increment for accurate ledger
    const postCashback = await tx.user.findUnique({
      where: { id: params.buyerId },
      select: { buyerWallet: true },
    });
    const cashbackAfter = postCashback?.buyerWallet.toNumber() ?? (buyer.buyerWallet.toNumber() + cashback);
    const cashbackBefore = cashbackAfter - cashback;
    await tx.walletTransaction.create({
      data: {
        userId: params.buyerId,
        type: 'CASHBACK',
        amount: cashback,
        currency: params.currency,
        orderId: params.orderId,
        balanceBefore: cashbackBefore,
        balanceAfter: cashbackAfter,
        description: `${(rate * 100).toFixed(rate === 0.015 || rate === 0.025 ? 1 : 0)}% cashback from order ${params.orderNumber} (${buyer.rank})`,
        metadata: { orderNumber: params.orderNumber, rate, rank: buyer.rank },
      },
    });

    return cashback;
  }

  /* Withdraw — multi-rail. UPI / PayPal / Wise / Bank routed to the
     correct fields. Admin manually approves in the admin panel. */
  async withdraw(userId: string, dto: WithdrawDto): Promise<{ id: string }> {
    /* Per-method floors. Wise/Bank larger because fixed-fee rails. */
    const minByMethod: Record<typeof dto.method, number> = {
      UPI: 100,
      PAYPAL: 10,
      WISE: 20,
      BANK_TRANSFER_INTL: 50,
    };
    const minAmount = minByMethod[dto.method];
    if (dto.amount < minAmount) {
      throw new BadRequestException(
        `Minimum ${dto.method.replace('_', ' ').toLowerCase()} withdraw is ${minAmount}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          buyerWallet: true,
          sellerWallet: true,
          preferredCurrency: true,
          email: true,
          name: true,
          kycStatus: true,
          stripeConnectPayoutsEnabled: true,
        },
      });
      if (!user) throw new NotFoundException();

      // PAY-CRIT-007: check combined wallet — seller earnings land in
      // sellerWallet; gating on buyerWallet alone means sellers can never
      // withdraw their earnings.
      const totalAvailable =
        user.sellerWallet.toNumber() + user.buyerWallet.toNumber();
      if (totalAvailable < dto.amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      if (user.kycStatus !== 'VERIFIED') {
        throw new ForbiddenException(
          'KYC verification required before withdrawing funds. Complete identity verification from your profile.',
        );
      }

      const needsConnect =
        dto.method === 'WISE' || dto.method === 'BANK_TRANSFER_INTL';
      if (needsConnect && !user.stripeConnectPayoutsEnabled) {
        throw new BadRequestException(
          'Finish Stripe Connect onboarding before withdrawing via Wise/Bank',
        );
      }

      // PAY-HIGH-020: validate UPI destination against saved PaymentMethod rows —
      // prevents withdrawing to an arbitrary unverified destination on each request
      if (dto.method === 'UPI' && 'upiId' in dto) {
        const savedMethod = await tx.paymentMethod.findFirst({
          where: { userId, type: 'UPI', upiId: dto.upiId },
        });
        if (!savedMethod) {
          throw new BadRequestException(
            'UPI ID not found in your saved payment methods. Add it via Profile → Payment Methods first.',
          );
        }
      }

      // PAY-HIGH-014: daily velocity check — max $5k or 5 requests per day
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const todayCount = await tx.withdrawal.count({
        where: { userId, requestedAt: { gte: dayStart }, status: { not: 'CANCELLED' } },
      });
      if (todayCount >= 5) {
        throw new BadRequestException(
          'Daily withdrawal limit reached (5 per day). Try again tomorrow.',
        );
      }
      const todayTotal = await tx.withdrawal.aggregate({
        where: { userId, requestedAt: { gte: dayStart }, status: { not: 'CANCELLED' } },
        _sum: { amount: true },
      });
      const todaySpent = todayTotal._sum.amount?.toNumber() ?? 0;
      if (todaySpent + dto.amount > 5000) {
        throw new BadRequestException(
          `Daily withdrawal cap exceeded. Remaining today: $${(5000 - todaySpent).toFixed(2)}`,
        );
      }

      // PAY-CRIT-006: atomic balance debit — debit sellerWallet first, then
      // buyerWallet for any remainder. The WHERE predicate ensures no race
      // can overdraw: if the combined balance dropped between our read and
      // this update, the updateMany returns count=0 and we throw.
      const fromSeller = Math.min(user.sellerWallet.toNumber(), dto.amount);
      const fromBuyer = dto.amount - fromSeller;

      if (fromSeller > 0) {
        const claim = await tx.user.updateMany({
          where: { id: userId, sellerWallet: { gte: fromSeller } },
          data: { sellerWallet: { decrement: fromSeller } },
        });
        if (claim.count === 0) {
          throw new BadRequestException('Insufficient wallet balance');
        }
      }
      if (fromBuyer > 0) {
        const claim = await tx.user.updateMany({
          where: { id: userId, buyerWallet: { gte: fromBuyer } },
          data: { buyerWallet: { decrement: fromBuyer } },
        });
        if (claim.count === 0) {
          throw new BadRequestException('Insufficient wallet balance');
        }
      }

      const currency = user.preferredCurrency ?? 'USD';
      const isInrPayout = dto.method === 'UPI';

      // PAY-LOW-036: timestamp+random collision → cryptographic random suffix
      // randomBytes is a static import — no dynamic require needed
      const withdrawalNumber = `WD-${new Date().getFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`;

      const methodFields = (() => {
        switch (dto.method) {
          case 'UPI':
            return { upiId: dto.upiId };
          case 'PAYPAL':
            return { paypalEmail: dto.paypalEmail };
          case 'WISE':
            return { wiseEmail: dto.wiseEmail };
          case 'BANK_TRANSFER_INTL':
            return {
              bankAccountEncrypted: encryptPii(
                JSON.stringify({
                  holderName: dto.holderName,
                  iban: dto.iban,
                  bic: dto.bic,
                  bankName: dto.bankName,
                }),
              ),
            };
        }
      })();

      // PAY-HIGH-019: re-read wallets after the atomic decrements
      const postWithdraw = await tx.user.findUnique({
        where: { id: userId },
        select: { buyerWallet: true, sellerWallet: true },
      });
      const newBalanceAfter = postWithdraw
        ? postWithdraw.buyerWallet.toNumber() + postWithdraw.sellerWallet.toNumber()
        : totalAvailable - dto.amount;

      const withdrawal = await tx.withdrawal.create({
        data: {
          withdrawalNumber,
          userId,
          amount: dto.amount,
          fee: 0,
          netAmount: dto.amount,
          fxRate: 1,
          method: dto.method,
          status: 'PENDING',
          requestedAt: new Date(),
          amountInr: isInrPayout ? dto.amount : null,
          netAmountInr: isInrPayout ? dto.amount : null,
          ...methodFields,
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          amount: -dto.amount,
          currency,
          withdrawalId: withdrawal.id,
          balanceBefore: totalAvailable,
          balanceAfter: newBalanceAfter,
          description: `Withdrawal request ${withdrawalNumber} · ${dto.method}`,
        },
      });

      void this.notifications.create({
        userId,
        type: 'WITHDRAWAL_REQUESTED',
        title: 'Withdrawal requested',
        message: `Your ${dto.method.replace('_', ' ').toLowerCase()} withdrawal of ${dto.amount.toFixed(2)} ${currency} is in review. We'll process within 24 hours.`,
        link: '/profile/wallet',
        metadata: { withdrawalId: withdrawal.id, method: dto.method },
        sendEmail: false,
      });

      return { id: withdrawal.id };
    });
  }
}
