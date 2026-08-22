import AdminDashboardPage from './page';
import { AdminDashboard } from '@/features/admin/dashboard/ui/admin-dashboard';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { prisma } from '@/shared/lib/prisma';

jest.mock('@/shared/lib/page-auth', () => ({ requirePanelPageSession: jest.fn() }));

const createdAt = new Date('2026-03-07T12:00:00Z');

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    (requirePanelPageSession as jest.Mock).mockResolvedValue({ user: { role: 'admin' } });
    (prisma.post.count as jest.Mock).mockResolvedValue(5);
    (prisma.member.count as jest.Mock).mockResolvedValue(3);
    (prisma.project.count as jest.Mock).mockResolvedValue(2);
    (prisma.user.count as jest.Mock).mockResolvedValue(4);
    (prisma.post.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', title: 'Post', status: 'published', createdAt, author: { name: 'Ana' } },
    ]);
    (prisma.member.findMany as jest.Mock).mockResolvedValue([
      { id: 'm1', name: 'Ana', createdAt, user: { email: 'ana@k.dev' } },
    ]);
    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      { id: 'pr1', title: 'Proj', createdAt },
    ]);
  });

  it('exige sessão administrativa antes de buscar métricas', async () => {
    await AdminDashboardPage();
  });

  it('renderiza AdminDashboard com as quatro contagens', async () => {
    const el = await AdminDashboardPage();
    expect(el.type).toBe(AdminDashboard);
    expect(el.props.posts).toBe(5);
    expect(el.props.members).toBe(3);
    expect(el.props.projects).toBe(2);
    expect(el.props.users).toBe(4);
  });

  it('passa as listas recentes já mapeadas', async () => {
    const el = await AdminDashboardPage();
    expect(el.props.recentPosts).toEqual([
      expect.objectContaining({ id: 'p1', title: 'Post', tag: 'Publicado' }),
    ]);
    expect(el.props.recentMembers).toEqual([
      expect.objectContaining({ id: 'm1', href: '/admin/members/m1/edit' }),
    ]);
    expect(el.props.recentProjects).toEqual([expect.objectContaining({ id: 'pr1' })]);
  });

  it('limita as listas recentes a 5 itens, mais novos primeiro', async () => {
    await AdminDashboardPage();
    for (const model of [prisma.post, prisma.member, prisma.project]) {
      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, orderBy: { createdAt: 'desc' } }),
      );
    }
  });
});
