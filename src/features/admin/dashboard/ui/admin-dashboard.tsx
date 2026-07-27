import Link from 'next/link';
import { AdminMetricCard } from './admin-metric-card';

type Props = {
  posts: number;
  members: number;
  projects: number;
};

export function AdminDashboard({ posts, members, projects }: Props) {
  return (
    <div className="architectural-grid min-h-screen bg-[#050505] px-6 py-16 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Admin</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Dashboard</h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <AdminMetricCard label="Posts" value={posts} delayClass="delay-100" />
          <AdminMetricCard
            label="Membros"
            value={members}
            href="/admin/members"
            delayClass="delay-200"
          />
          <AdminMetricCard label="Projetos" value={projects} delayClass="delay-300" />
        </div>

        <div className="mt-8 animate-fade-up delay-400">
          <Link
            href="/admin/members/new"
            className="inline-block rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
          >
            Novo membro
          </Link>
        </div>
      </div>
    </div>
  );
}
