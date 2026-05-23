import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export default async function globalTeardown() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@kiwibit.test' } } });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
