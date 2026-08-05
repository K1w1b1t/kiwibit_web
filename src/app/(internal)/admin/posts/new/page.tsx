import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { AdminPostForm } from '@/features/admin/posts/ui/admin-post-form';

export default async function NewPostPage() {
  await requireAdminPageSession();

  return (
    <AdminPageShell
      title="Novo Post"
      width="form"
      description="Salva como rascunho por padrão. Publique quando estiver pronto."
    >
      <AdminPostForm />
    </AdminPageShell>
  );
}
