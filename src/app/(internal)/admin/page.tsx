import { prisma } from '@/shared/lib/prisma';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminDashboard } from '@/features/admin/dashboard/ui/admin-dashboard';
import {
  membersToDashboardItems,
  postsToDashboardItems,
  projectsToDashboardItems,
} from '@/features/admin/dashboard/model/to-dashboard-items';

const RECENT_TAKE = 5;

export default async function AdminDashboardPage() {
  await requireAdminPageSession();

  const [posts, members, projects, users, recentPosts, recentMembers, recentProjects] =
    await Promise.all([
      prisma.post.count(),
      prisma.member.count(),
      prisma.project.count(),
      prisma.user.count(),
      prisma.post.findMany({
        take: RECENT_TAKE,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      }),
      prisma.member.findMany({
        take: RECENT_TAKE,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
      prisma.project.findMany({
        take: RECENT_TAKE,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, createdAt: true },
      }),
    ]);

  return (
    <AdminDashboard
      posts={posts}
      members={members}
      projects={projects}
      users={users}
      recentPosts={postsToDashboardItems(recentPosts)}
      recentMembers={membersToDashboardItems(recentMembers)}
      recentProjects={projectsToDashboardItems(recentProjects)}
    />
  );
}
