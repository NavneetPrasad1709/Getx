import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { RejectWithdrawalDto, WithdrawalActionDto } from '../dto/admin.dto';

// Explicit include + payload type so the inferred return type of
// listWithdrawals is nameable (TS2742: a bare findMany return references the
// non-portable @prisma/client runtime path).
const WITHDRAWAL_LIST_INCLUDE = {
  user: { select: { id: true, email: true, username: true, name: true } },
} satisfies Prisma.WithdrawalInclude;

type WithdrawalListRow = Prisma.WithdrawalGetPayload<{
  include: typeof WITHDRAWAL_LIST_INCLUDE;
}>;

@Injectable()
export class AdminFinanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  async listWithdrawals(status?: string): Promise<WithdrawalListRow[]> {
    return this.prisma.withdrawal.findMany({
      where: status ? { status: status as 'PENDING' } : undefined,
      orderBy: { requestedAt: 'desc' },
      take: 100,
      include: WITHDRAWAL_LIST_INCLUDE,
    });
  }

  async approveWithdrawal(adminId: string, withdrawalId: string, _dto: WithdrawalActionDto) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(`Withdrawal is ${withdrawal.status} — can only approve PENDING`);
    }

    await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'APPROVED', approvedAt: new Date(), reviewedById: adminId, reviewedAt: new Date() },
    });

    await this.audit.log({
      userId: adminId,
      action: 'admin.withdrawal_approved',
      entity: 'Withdrawal',
      entityId: withdrawalId,
      metadata: { withdrawalNumber: withdrawal.withdrawalNumber, amount: withdrawal.amount.toNumber() },
      severity: 'CRITICAL',
    });

    void this.notifications.create({
      userId: withdrawal.userId,
      type: 'WITHDRAWAL_APPROVED',
      title: 'Withdrawal approved',
      message: `Your withdrawal of $${withdrawal.amount.toNumber().toFixed(2)} (${withdrawal.method}) has been approved and is being processed.`,
      link: '/profile/wallet',
      metadata: { withdrawalId, amount: withdrawal.amount.toNumber() },
      sendEmail: true,
    });

    return { success: true };
  }

  async rejectWithdrawal(adminId: string, withdrawalId: string, dto: RejectWithdrawalDto) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: { select: { id: true } } },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (!['PENDING', 'APPROVED'].includes(withdrawal.status)) {
      throw new BadRequestException(`Cannot reject a ${withdrawal.status} withdrawal`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: withdrawal.userId },
        data: { sellerWallet: { increment: withdrawal.amount } },
      });

      const user = await tx.user.findUnique({
        where: { id: withdrawal.userId },
        select: { sellerWallet: true },
      });

      await tx.walletTransaction.create({
        data: {
          userId: withdrawal.userId,
          type: 'ADJUSTMENT',
          amount: withdrawal.amount,
          currency: 'USD',
          withdrawalId,
          balanceBefore: user ? user.sellerWallet.toNumber() - withdrawal.amount.toNumber() : 0,
          balanceAfter: user?.sellerWallet.toNumber() ?? withdrawal.amount.toNumber(),
          description: `Withdrawal ${withdrawal.withdrawalNumber} rejected: ${dto.reason}`,
        },
      });

      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'REJECTED', rejectionReason: dto.reason, reviewedById: adminId, reviewedAt: new Date() },
      });
    });

    await this.audit.log({
      userId: adminId,
      action: 'admin.withdrawal_rejected',
      entity: 'Withdrawal',
      entityId: withdrawalId,
      metadata: { withdrawalNumber: withdrawal.withdrawalNumber, reason: dto.reason },
      severity: 'CRITICAL',
    });

    void this.notifications.create({
      userId: withdrawal.userId,
      type: 'WITHDRAWAL_FAILED',
      title: 'Withdrawal rejected',
      message: `Your withdrawal request was rejected. Reason: ${dto.reason}. Funds returned to your wallet.`,
      link: '/profile/wallet',
      metadata: { withdrawalId, reason: dto.reason },
      sendEmail: true,
    });

    return { success: true };
  }
}
