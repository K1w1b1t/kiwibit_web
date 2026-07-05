import AdminDashboardPage from './page';
import { AdminDashboard } from '@/features/admin/dashboard/ui/admin-dashboard';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { prisma } from '@/shared/lib/prisma';

jest.mock('@/shared/lib/page-auth', () => ({ requireAdminPageSession: jest.fn() }));

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    (requireAdminPageSession as jest.Mock).mockResolvedValue({ user: { role: 'admin' } });
    (prisma.post.count as jest.Mock).mockResolvedValue(5);
    (prisma.member.count as jest.Mock).mockResolvedValue(3);
    (prisma.project.count as jest.Mock).mockResolvedValue(2);
  });

  it('exige sessão administrativa antes de buscar métricas', async () => {
    await AdminDashboardPage();
    expect(requireAdminPageSession).toHaveBeenCalledTimes(1);
  });

  it('renderiza AdminDashboard com as três contagens', async () => {
    const el = await AdminDashboardPage();
    expect(el.type).toBe(AdminDashboard);
    expect(el.props).toEqual({ posts: 5, members: 3, projects: 2 });
  });
});
