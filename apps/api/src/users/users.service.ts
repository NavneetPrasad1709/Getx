import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@getx/database';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_PROFILE_SELECT = {
  id: true,
  username: true,
  name: true,
  avatar: true,
  bio: true,
  country: true,
  isSeller: true,
  sellerRating: true,
  buyerRating: true,
  totalReviews: true,
  totalSales: true,
  verifiedTier: true,
  isVerified: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicProfile = Prisma.UserGetPayload<{
  select: typeof PUBLIC_PROFILE_SELECT;
}>;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getByUsername(username: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getById(id: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
