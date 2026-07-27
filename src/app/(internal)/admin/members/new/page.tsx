import { AdminMemberForm } from '@/features/admin/members/ui/admin-member-form';
import { requireAdminPageSession } from '@/shared/lib/page-auth';

export default async function NewMemberPage() {
  await requireAdminPageSession();

  return (
    <main>
      <AdminMemberForm />
    </main>
  );
}
