import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaymentMethod } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dto/payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  async listMine(userId: string): Promise<PaymentMethod[]> {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(
    userId: string,
    dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.paymentMethod.count({ where: { userId } });
      const shouldDefault = dto.isDefault ?? count === 0;
      if (shouldDefault) {
        await tx.paymentMethod.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.paymentMethod.create({
        data: {
          userId,
          type: dto.type,
          upiId: dto.upiId ?? null,
          label: dto.label ?? null,
          isDefault: shouldDefault,
        },
      });
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    const existing = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.paymentMethod.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.paymentMethod.update({
        where: { id },
        data: {
          ...(dto.upiId !== undefined ? { upiId: dto.upiId } : {}),
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
  }

  async remove(userId: string, id: string): Promise<{ success: true }> {
    const existing = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentMethod.delete({ where: { id } });
      if (existing.isDefault) {
        const next = await tx.paymentMethod.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.paymentMethod.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { success: true };
  }
}
