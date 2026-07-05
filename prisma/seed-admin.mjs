import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

/**
 * Admin-only seed for the CI/CD migration pipeline.
 *
 * Behavior:
 * - Creates the admin user only if it does not exist yet.
 * - Always resets the admin password to ADMIN_PASSWORD (from a secret).
 * - Does NOT insert demo content (projects/posts).
 *
 * Required env: ADMIN_PASSWORD, DATABASE_URL
 * Optional env: ADMIN_EMAIL (default admin@kiwibit.dev), ADMIN_NAME (default "Admin")
 */

const connectionString = process.env.DATABASE_URL;

// Supabase's pooler presents a self-signed certificate. Recent `pg` versions
// treat `sslmode=require` as `verify-full`, which rejects it. When the URL asks
// for SSL, keep the connection encrypted but skip CA verification.
const useSsl = /sslmode=(require|verify-ca|verify-full|prefer)/.test(connectionString ?? '');

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@kiwibit.dev';
const adminName = process.env.ADMIN_NAME ?? 'Admin';
const adminPassword = process.env.ADMIN_PASSWORD;

async function main() {
  if (!adminPassword) {
    throw new Error('Missing ADMIN_PASSWORD environment variable');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    // If the admin already exists: keep everything, only reset the password.
    update: { password: passwordHash },
    // If it does not exist: create it as admin.
    create: {
      name: adminName,
      email: adminEmail,
      role: 'admin',
      password: passwordHash,
    },
  });

  console.log(`Admin ensured: ${admin.email} (password reset).`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
