import Link from 'next/link';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import type { DashboardItem } from '@/features/admin/dashboard/model/to-dashboard-items';
import { AdminMetricCard } from './admin-metric-card';
import { AdminRecentList } from './admin-recent-list';

type Props = {
  posts: number;
  members: number;
  projects: number;
  users: number;
  recentPosts: readonly DashboardItem[];
  recentMembers: readonly DashboardItem[];
  recentProjects: readonly DashboardItem[];
  isMember?: boolean;
};

export function AdminDashboard({
  posts,
  members,
  projects,
  users,
  recentPosts,
  recentMembers,
  recentProjects,
  isMember = false,
}: Readonly<Props>) {
  return (
    <AdminPageShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard label="Posts" value={posts} href="/admin/posts" delayClass="delay-100" />
        {!isMember && (
          <AdminMetricCard
            label="Membros"
            value={members}
            href="/admin/members"
            delayClass="delay-200"
          />
        )}
        {!isMember && (
          <AdminMetricCard
            label="Projetos"
            value={projects}
            href="/admin/projects"
            delayClass="delay-300"
          />
        )}
        <AdminMetricCard
          label="Usuários"
          value={users}
          href="/admin/users"
          delayClass="delay-400"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <AdminRecentList
          title="Últimos posts"
          items={recentPosts}
          emptyMessage="Nenhum post ainda."
          seeAllHref="/admin/posts"
          delayClass="delay-200"
        />
        {!isMember && (
          <AdminRecentList
            title="Últimos membros"
            items={recentMembers}
            emptyMessage="Nenhum membro ainda."
            seeAllHref="/admin/members"
            delayClass="delay-300"
          />
        )}
        {!isMember && (
          <AdminRecentList
            title="Últimos projetos"
            items={recentProjects}
            emptyMessage="Nenhum projeto ainda."
            seeAllHref="/admin/projects"
            delayClass="delay-400"
          />
        )}
      </div>

      {!isMember && (
        <div className="animate-fade-up delay-500 mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin/members/new"
            className="inline-block rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
          >
            Novo membro
          </Link>
          <Link
            href="/admin/users/new"
            className="inline-block rounded-full border border-white/35 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white/80"
          >
            Novo usuário
          </Link>
        </div>
      )}
    </AdminPageShell>
  );
}
