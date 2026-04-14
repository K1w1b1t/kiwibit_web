import { PrismaClient } from '@prisma/client';

export default async function globalTeardown() {
  const prisma = new PrismaClient();

  try {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@kiwibit.test' } } });
  } finally {
    await prisma.$disconnect();
  }
}
