import { redirect } from 'next/navigation';
import { requirePanelPageSession } from '@/shared/lib/page-auth';

export default async function ConnectionsPage() {
  await requirePanelPageSession();
  redirect('/admin/account');
}
