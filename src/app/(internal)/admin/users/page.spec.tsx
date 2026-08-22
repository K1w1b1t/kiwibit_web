import AdminUsersPage from './page';
import { prisma } from '@/shared/lib/prisma';
import { requirePanelPageSession } from '@/shared/lib/page-auth';

jest.mock('@/shared/lib/page-auth', () => ({
  requirePanelPageSession: jest.fn(),
}));

const USERS = [
  {
    id: 'uid-1',
    name: 'Alice',
    email: 'alice@test.com',
    role: 'admin',
    createdAt: new Date('2026-01-01'),
  },
];

describe('AdminUsersPage', () => {
  beforeEach(() => {
    (requirePanelPageSession as jest.Mock).mockResolvedValue({
      user: { id: 'uid-1', role: 'admin' },
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue(USERS);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
  });

  it('exige sessão administrativa antes de consultar', async () => {
    await AdminUsersPage({ searchParams: Promise.resolve({}) });
  });

  it('nunca seleciona a coluna password', async () => {
    await AdminUsersPage({ searchParams: Promise.resolve({}) });
    const args = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(args.select.password).toBeUndefined();
    expect(args.select.email).toBe(true);
  });

  it('aplica page e limit da querystring', async () => {
    await AdminUsersPage({ searchParams: Promise.resolve({ page: '3', limit: '10' }) });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('cai nos defaults para querystring inválida', async () => {
    await AdminUsersPage({ searchParams: Promise.resolve({ page: 'x', limit: '999' }) });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });
});
