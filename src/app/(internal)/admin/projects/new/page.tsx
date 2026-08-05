import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { AdminProjectForm } from '@/features/admin/projects/ui/admin-project-form';

export default async function NewProjectPage() {
  await requireAdminPageSession();

  return (
    <AdminPageShell
      title="Novo Projeto"
      width="form"
      description="Salve o projeto primeiro; as imagens são adicionadas na tela de edição."
    >
      <AdminProjectForm />
    </AdminPageShell>
  );
}
