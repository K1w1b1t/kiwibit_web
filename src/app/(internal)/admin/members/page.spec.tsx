import AdminMembersPage from './page';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { prisma } from '@/shared/lib/prisma';
import { AdminMembersTable } from '@/features/admin/members/ui/admin-members-table';

jest.mock('@/shared/lib/page-auth', () => ({ requirePanelPageSession: jest.fn() }));

describe('AdminMembersPage', () => {
  beforeEach(() => {
    (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.member.count as jest.Mock).mockResolvedValue(0);
  });

  it('limits a member to the profile linked to their account', async () => {
    (requirePanelPageSession as jest.Mock).mockResolvedValue({
      user: { id: 'uid-member', role: 'member' },
    });

    const element = await AdminMembersPage({ searchParams: Promise.resolve({}) });

    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'uid-member' } }),
    );
    expect(prisma.member.count).toHaveBeenCalledWith({ where: { userId: 'uid-member' } });
    expect(element.props.children.type).toBe(AdminMembersTable);
    expect(element.props.children.props.canCreate).toBe(false);
  });

  it.each(['admin', 'editor', 'member_manager'])('lists every member for %s', async (role) => {
    (requirePanelPageSession as jest.Mock).mockResolvedValue({ user: { id: 'uid-admin', role } });

    const element = await AdminMembersPage({ searchParams: Promise.resolve({}) });

    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
    expect(prisma.member.count).toHaveBeenCalledWith({ where: undefined });
    expect(element.props.children.props.canCreate).toBe(true);
  });
});
