import { prisma } from '@/shared/lib/prisma';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { AdminDashboard } from '@/features/admin/dashboard/ui/admin-dashboard';
import {
  membersToDashboardItems,
  postsToDashboardItems,
  projectsToDashboardItems,
} from '@/features/admin/dashboard/model/to-dashboard-items';

const RECENT_TAKE = 5;

export default async function AdminDashboardPage() {
  const session = await requirePanelPageSession();
  const isMember = session.user.role === 'member';
  const ownPostWhere = isMember ? { authorId: session.user.id } : undefined;
  const ownMemberWhere = isMember ? { userId: session.user.id } : undefined;

  const [posts, members, projects, users, recentPosts, recentMembers, recentProjects] =
    await Promise.all([
      prisma.post.count({ where: ownPostWhere }),
      prisma.member.count({ where: ownMemberWhere }),
      isMember ? Promise.resolve(0) : prisma.project.count(),
      isMember ? Promise.resolve(1) : prisma.user.count(),
      prisma.post.findMany({
        where: ownPostWhere,
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
        where: ownMemberWhere,
        take: RECENT_TAKE,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
      isMember
        ? Promise.resolve([])
        : prisma.project.findMany({
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
      isMember={isMember}
    />
  );
}
