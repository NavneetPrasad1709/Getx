import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    throw new Error('Usage: tsx promote-super-admin.ts <email>');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No user with email: ${email}`);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: {
      role: UserRole.SUPER_ADMIN,
      emailVerified: user.emailVerified ?? new Date(),
      status: 'ACTIVE',
    },
    select: { id: true, email: true, name: true, role: true, status: true, emailVerified: true },
  });

  console.log('Promoted to SUPER_ADMIN:');
  console.log(updated);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
