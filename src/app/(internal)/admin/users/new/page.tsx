import { redirect } from 'next/navigation';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
export default async function NewUserPage() {
  await requireAdminPageSession();
  redirect('/admin/members/new');
}
