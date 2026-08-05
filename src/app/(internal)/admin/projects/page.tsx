import Link from 'next/link';
import { prisma } from '@/shared/lib/prisma';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { parseLimitParam, parsePageParam } from '@/shared/lib/pagination';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { AdminProjectsTable } from '@/features/admin/projects/ui/admin-projects-table';

export default async function AdminProjectsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ page?: string; limit?: string }>;
}>) {
  await requireAdminPageSession();

  const { page: pageParam, limit: limitParam } = await searchParams;
  const pageSize = parseLimitParam(limitParam);
  const page = parsePageParam(pageParam);

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true,
        title: true,
        updatedAt: true,
        images: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: { url: true, isCover: true },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.project.count(),
  ]);

  const rows = projects.map((project) => ({
    id: project.id,
    title: project.title,
    updatedAt: project.updatedAt,
    // Degrades gracefully: a project with images but no cover flag still shows one.
    coverUrl: (project.images.find((image) => image.isCover) ?? project.images[0])?.url ?? null,
    imageCount: project.images.length,
  }));

  return (
    <AdminPageShell
      title="Projetos"
      description="Cada projeto pode ter um carrossel de imagens, com capa escolhida."
      action={
        <Link
          href="/admin/projects/new"
          className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
        >
          Novo projeto
        </Link>
      }
    >
      <AdminProjectsTable projects={rows} page={page} total={total} pageSize={pageSize} />
    </AdminPageShell>
  );
}
