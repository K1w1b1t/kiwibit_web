import { redirect } from 'next/navigation';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
export default async function UsersPage() {
  await requirePanelPageSession();
  redirect('/admin/members');
}
