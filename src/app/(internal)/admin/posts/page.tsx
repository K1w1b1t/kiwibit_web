import Link from 'next/link';
import { prisma } from '@/shared/lib/prisma';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { parseLimitParam, parsePageParam } from '@/shared/lib/pagination';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { AdminPostsTable } from '@/features/admin/posts/ui/admin-posts-table';

export default async function AdminPostsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ page?: string; limit?: string }>;
}>) {
  const session = await requirePanelPageSession();
  const isMember = session.user.role === 'member';
  const where = isMember ? { authorId: session.user.id } : undefined;

  const { page: pageParam, limit: limitParam } = await searchParams;
  const pageSize = parseLimitParam(limitParam);
  const page = parsePageParam(pageParam);

  // Unlike the public list, this one shows drafts too.
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        coverImageUrl: true,
        createdAt: true,
        author: { select: { name: true } },
      },
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.count({ where }),
  ]);

  const rows = posts.map((post) => ({
    id: post.id,
    title: post.title,
    status: post.status,
    coverImageUrl: post.coverImageUrl,
    authorName: post.author?.name ?? 'Autor removido',
    createdAt: post.createdAt,
  }));

  return (
    <AdminPageShell
      title="Blog"
      description="Rascunhos ficam invisíveis no site público até serem publicados."
      action={
        !isMember && (
          <Link
            href="/admin/posts/new"
            className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
          >
            Novo post
          </Link>
        )
      }
    >
      <AdminPostsTable posts={rows} page={page} total={total} pageSize={pageSize} />
    </AdminPageShell>
  );
}
