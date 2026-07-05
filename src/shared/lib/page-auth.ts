import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/shared/lib/auth';
import { ADMIN_ROLES } from '@/shared/lib/roles';

/**
 * Guard para páginas /admin (server components).
 * Sem sessão → /login; role fora de ADMIN_ROLES → /.
 */
export async function requireAdminPageSession() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (!ADMIN_ROLES.has(session.user.role)) redirect('/');
  return session;
}
