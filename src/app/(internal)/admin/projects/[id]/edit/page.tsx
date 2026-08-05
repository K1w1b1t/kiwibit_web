import { notFound } from 'next/navigation';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { AdminProjectForm } from '@/features/admin/projects/ui/admin-project-form';
import { ProjectGalleryManager } from '@/features/admin/projects/ui/project-gallery-manager';
import { DeleteButton } from '@/shared/ui/delete-button';

type Params = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Readonly<Params>) {
  await requireAdminPageSession();

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      repoUrl: true,
      liveUrl: true,
      images: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, url: true, alt: true, position: true, isCover: true },
      },
    },
  });

  if (!project) notFound();

  return (
    <AdminPageShell
      title="Editar Projeto"
      width="form"
      action={
        <DeleteButton
          endpoint={`/api/admin/projects/${project.id}`}
          resourceLabel="projeto"
          redirectTo="/admin/projects"
        />
      }
    >
      <AdminProjectForm initial={project} />
      <ProjectGalleryManager projectId={project.id} initialImages={project.images} />
    </AdminPageShell>
  );
}
