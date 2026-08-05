import Link from 'next/link';
import { formatDate } from '@/shared/lib/format-date';
import { DataTable, type Column } from '@/shared/ui/data-table';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageSizeSelector, Pagination } from '@/shared/ui/pagination';

export type ProjectRow = {
  id: string;
  title: string;
  updatedAt: Date;
  /** Cover thumbnail, when the project has images. */
  coverUrl: string | null;
  imageCount: number;
};

type Props = {
  projects: ProjectRow[];
  page: number;
  total: number;
  pageSize: number;
};

const COLUMNS: ReadonlyArray<Column<ProjectRow>> = [
  {
    key: 'cover',
    header: 'Capa',
    width: 'w-[80px]',
    cell: (project) =>
      project.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.coverUrl}
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
    cell: (project) => <span className="text-white/90">{project.title}</span>,
  },
  {
    key: 'images',
    header: 'Imagens',
    width: 'w-[110px]',
    cell: (project) => <span className="text-white/50">{project.imageCount}</span>,
  },
  {
    key: 'updatedAt',
    header: 'Atualizado em',
    width: 'w-[140px]',
    cell: (project) => <span className="text-white/50">{formatDate(project.updatedAt)}</span>,
  },
  {
    key: 'actions',
    header: 'Ações',
    align: 'right',
    width: 'w-[100px]',
    cell: (project) => (
      <Link
        href={`/admin/projects/${project.id}/edit`}
        className="text-xs uppercase tracking-[0.12em] text-white/40 transition hover:text-white"
      >
        Editar →
      </Link>
    ),
  },
];

export function AdminProjectsTable({ projects, page, total, pageSize }: Readonly<Props>) {
  if (projects.length === 0) {
    return (
      <EmptyState
        message="Nenhum projeto cadastrado."
        action={
          <Link
            href="/admin/projects/new"
            className="inline-block rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-[0.14em] text-white/70 transition hover:border-white/50 hover:text-white"
          >
            Criar primeiro projeto
          </Link>
        }
      />
    );
  }

  return (
    <div className="animate-fade-up delay-100">
      <PageSizeSelector pageSize={pageSize} total={total} />
      <DataTable columns={COLUMNS} rows={projects} rowKey={(project) => project.id} />
      <Pagination page={page} total={total} pageSize={pageSize} />
    </div>
  );
}
