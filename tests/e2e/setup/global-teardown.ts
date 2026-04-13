import { PrismaClient } from '@prisma/client';
import { E2E_ADMIN_EMAIL } from './global-setup';

export default async function globalTeardown() {
  const prisma = new PrismaClient();

  try {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@kiwibit.test' } } });
  } finally {
    await prisma.$disconnect();
  }
}
