import Link from 'next/link';
import type { PostStatus } from '@prisma/client';
import { formatDate } from '@/shared/lib/format-date';
import { POST_STATUS_LABELS } from '@/shared/lib/post-status';
import { cn } from '@/shared/lib/cn';
import { DataTable, type Column } from '@/shared/ui/data-table';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageSizeSelector, Pagination } from '@/shared/ui/pagination';

export type PostRow = {
  id: string;
  title: string;
  status: PostStatus;
  coverImageUrl: string | null;
  authorName: string;
  createdAt: Date;
};

type Props = {
  posts: PostRow[];
  page: number;
  total: number;
  pageSize: number;
};

const STATUS_TONES: Record<PostStatus, string> = {
  published: 'border-accent/40 text-accent',
  draft: 'border-white/15 text-white/50',
};

const COLUMNS: ReadonlyArray<Column<PostRow>> = [
  {
    key: 'cover',
    header: 'Capa',
    width: 'w-[80px]',
    cell: (post) =>
      post.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          className="h-10 w-16 rounded-lg border border-white/10 object-cover"
        />
      ) : (
        <span className="text-xs text-white/25">—</span>
      ),
  },
  {
    key: 'title',
    header: 'Título',
    cell: (post) => <span className="text-white/90">{post.title}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    width: 'w-[130px]',
    cell: (post) => (
      <span
        className={cn(
          'inline-block rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]',
          STATUS_TONES[post.status],
        )}
      >
        {POST_STATUS_LABELS[post.status]}
      </span>
    ),
  },
  {
    key: 'author',
    header: 'Autor',
    width: 'w-[150px]',
    cell: (post) => <span className="text-white/50">{post.authorName}</span>,
  },
  {
    key: 'createdAt',
    header: 'Criado em',
    width: 'w-[130px]',
    cell: (post) => <span className="text-white/50">{formatDate(post.createdAt)}</span>,
  },
  {
    key: 'actions',
    header: 'Ações',
    align: 'right',
    width: 'w-[100px]',
    cell: (post) => (
      <Link
        href={`/admin/posts/${post.id}/edit`}
        className="text-xs uppercase tracking-[0.12em] text-white/40 transition hover:text-white"
      >
        Editar →
      </Link>
    ),
  },
];

export function AdminPostsTable({ posts, page, total, pageSize }: Readonly<Props>) {
  if (posts.length === 0) {
    return (
      <EmptyState
        message="Nenhum post ainda."
        action={
          <Link
            href="/admin/posts/new"
            className="inline-block rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-[0.14em] text-white/70 transition hover:border-white/50 hover:text-white"
          >
            Escrever primeiro post
          </Link>
        }
      />
    );
  }

  return (
    <div className="animate-fade-up delay-100">
      <PageSizeSelector pageSize={pageSize} total={total} />
      <DataTable columns={COLUMNS} rows={posts} rowKey={(post) => post.id} />
      <Pagination page={page} total={total} pageSize={pageSize} />
    </div>
  );
}
