import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, WalletTransaction } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RankService } from '../rank/rank.service';
import { ApplyWalletDto, WithdrawDto } from './dto/wallet.dto';

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
      balance: user.buyerWallet,
      pendingEarnings: user.pendingEarnings,
      sellerWallet: user.sellerWallet,
      totalEarned: user.totalEarned,
      totalSpent: user.totalSpent,
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
        throw new BadRequestException('Wallet credit can only be applied before payment');
      }
      if ((order.walletApplied ?? 0) > 0) {
        throw new BadRequestException('Wallet credit already applied — remove it first');
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

      const cap = order.buyerTotal * MAX_WALLET_APPLY_PCT;
      const maxApplicable = Math.min(user.buyerWallet, cap);
      const applied = Math.min(dto.amount, maxApplicable);
      if (applied <= 0) {
        throw new BadRequestException('Nothing to apply — balance or cap is zero');
      }

      const newBalance = user.buyerWallet - applied;

      await tx.user.update({
        where: { id: userId },
        data: { buyerWallet: { decrement: applied } },
      });

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
          balanceBefore: user.buyerWallet,
          balanceAfter: newBalance,
          description: `GETX Coins applied to order ${order.orderNumber}`,
          metadata: { orderNumber: order.orderNumber },
        },
      });

      return {
        walletApplied: applied,
        newBalance,
        chargeable: Math.max(0, order.buyerTotal - applied),
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
    if (!order || !order.walletApplied || order.walletApplied <= 0) return;

    const user = await tx.user.findUnique({
      where: { id: order.buyerId },
      select: { buyerWallet: true },
    });
    if (!user) return;

    const newBalance = user.buyerWallet + order.walletApplied;
    await tx.user.update({
      where: { id: order.buyerId },
      data: { buyerWallet: { increment: order.walletApplied } },
    });
    await tx.walletTransaction.create({
      data: {
        userId: order.buyerId,
        type: 'REFUND',
        amount: order.walletApplied,
        currency: order.currency,
        orderId: order.id,
        balanceBefore: user.buyerWallet,
        balanceAfter: newBalance,
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

    const newBalance = buyer.buyerWallet + cashback;
    await tx.user.update({
      where: { id: params.buyerId },
      data: {
        buyerWallet: { increment: cashback },
        totalSpent: { increment: params.buyerTotal },
      },
    });
    await tx.walletTransaction.create({
      data: {
        userId: params.buyerId,
        type: 'CASHBACK',
        amount: cashback,
        currency: params.currency,
        orderId: params.orderId,
        balanceBefore: buyer.buyerWallet,
        balanceAfter: newBalance,
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
          preferredCurrency: true,
          email: true,
          name: true,
          stripeConnectPayoutsEnabled: true,
        },
      });
      if (!user) throw new NotFoundException();
      if (user.buyerWallet < dto.amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }
      /* International rails (Wise / Bank) require Stripe Connect to be
         onboarded so we can use Stripe-paid-out funds instead of the
         manual admin queue. UPI + PayPal remain on the manual-approval
         queue for v1 since Razorpay/PayPal payouts ride a different
         lane. */
      const needsConnect =
        dto.method === 'WISE' || dto.method === 'BANK_TRANSFER_INTL';
      if (needsConnect && !user.stripeConnectPayoutsEnabled) {
        throw new BadRequestException(
          'Finish Stripe Connect onboarding before withdrawing via Wise/Bank',
        );
      }

      const newBalance = user.buyerWallet - dto.amount;
      const currency = user.preferredCurrency ?? 'USD';
      const isInrPayout = dto.method === 'UPI';

      await tx.user.update({
        where: { id: userId },
        data: { buyerWallet: { decrement: dto.amount } },
      });

      const withdrawalNumber = `WD-${Date.now()}-${Math.floor(Math.random() * 9999)
        .toString()
        .padStart(4, '0')}`;

      const methodFields = (() => {
        switch (dto.method) {
          case 'UPI':
            return { upiId: dto.upiId };
          case 'PAYPAL':
            return { paypalEmail: dto.paypalEmail };
          case 'WISE':
            return { wiseEmail: dto.wiseEmail };
          case 'BANK_TRANSFER_INTL':
            /* IBAN/BIC/holder are encrypted at rest in v2. For now store
               as a JSON blob in bankAccountEncrypted; admin sees raw
               in the queue. */
            return {
              bankAccountEncrypted: JSON.stringify({
                holderName: dto.holderName,
                iban: dto.iban,
                bic: dto.bic,
                bankName: dto.bankName,
              }),
            };
        }
      })();

      const withdrawal = await tx.withdrawal.create({
        data: {
          withdrawalNumber,
          userId,
          amount: dto.amount,
          fee: 0,
          netAmount: dto.amount,
          /* FX is identity for same-currency payouts. Admin queue updates
             fxRate/fxProvider when a cross-currency ramp is used. */
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
          balanceBefore: user.buyerWallet,
          balanceAfter: newBalance,
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
