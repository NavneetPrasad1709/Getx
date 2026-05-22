import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Address } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async listMine(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      /* First-ever address is auto-default. After that we honour the flag
         and clear other rows so only one stays default. */
      const count = await tx.address.count({ where: { userId } });
      const shouldDefault = dto.isDefault ?? count === 0;
      if (shouldDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          userId,
          fullName: dto.fullName,
          phone: dto.phone ?? null,
          line1: dto.line1,
          line2: dto.line2 ?? null,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,
          label: dto.label ?? null,
          taxId: dto.taxId ?? null,
          isDefault: shouldDefault,
        },
      });
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const existing = await this.prisma.address.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...(dto.line1 !== undefined ? { line1: dto.line1 } : {}),
          ...(dto.line2 !== undefined ? { line2: dto.line2 } : {}),
          ...(dto.city !== undefined ? { city: dto.city } : {}),
          ...(dto.state !== undefined ? { state: dto.state } : {}),
          ...(dto.postalCode !== undefined
            ? { postalCode: dto.postalCode }
            : {}),
          ...(dto.country !== undefined ? { country: dto.country } : {}),
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.taxId !== undefined ? { taxId: dto.taxId } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
  }

  async remove(userId: string, id: string): Promise<{ success: true }> {
    const existing = await this.prisma.address.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    if (existing.userId !== userId) throw new ForbiddenException();

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      /* If we just removed the default, promote the most-recent remaining
         address so the buyer always has a default. */
      if (existing.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { success: true };
  }
}
