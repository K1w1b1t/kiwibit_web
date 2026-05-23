import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { Pool } from 'pg';

export const E2E_ADMIN_EMAIL = 'e2e-admin@kiwibit.test';
export const E2E_ADMIN_PASSWORD = 'E2eAdmin#Test!2026';

export default async function globalSetup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findUnique({
      where: { email: E2E_ADMIN_EMAIL },
    });

    if (!existing) {
      const hashedPassword = await hash(E2E_ADMIN_PASSWORD, 12);
      await prisma.user.create({
        data: {
          name: 'E2E Test Admin',
          email: E2E_ADMIN_EMAIL,
          password: hashedPassword,
          role: 'admin',
        },
      });
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
