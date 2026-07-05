import { prisma } from '@/shared/lib/prisma';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminDashboard } from '@/features/admin/dashboard/ui/admin-dashboard';

export default async function AdminDashboardPage() {
  await requireAdminPageSession();

  const [posts, members, projects] = await Promise.all([
    prisma.post.count(),
    prisma.member.count(),
    prisma.project.count(),
  ]);

  return <AdminDashboard posts={posts} members={members} projects={projects} />;
}
