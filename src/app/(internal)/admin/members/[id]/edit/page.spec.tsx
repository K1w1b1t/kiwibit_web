import EditMemberPage from './page';
import { prisma } from '@/shared/lib/prisma';
import { notFound } from 'next/navigation';
import { requireAdminPageSession } from '@/shared/lib/page-auth';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
jest.mock('@/shared/lib/page-auth', () => ({
  requireAdminPageSession: jest.fn(),
}));
// Evita carregar o componente client no ambiente node do jest.
jest.mock('@/features/admin/members/ui/admin-member-form', () => ({
  AdminMemberForm: () => null,
}));
jest.mock('@/shared/ui/delete-button', () => ({
  DeleteButton: () => null,
}));
jest.mock('@/features/admin/members/ui/member-account-panel', () => ({
  MemberAccountPanel: () => null,
}));

const MEMBER = { id: 'mid-1', name: 'Alice', bio: 'Dev', avatarUrl: null, user: null };

describe('EditMemberPage', () => {
  beforeEach(() => {
    (requireAdminPageSession as jest.Mock).mockResolvedValue({
      user: { id: 'uid-1', role: 'admin' },
    });
  });

  it('exige sessão administrativa antes de buscar o membro', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    await EditMemberPage({ params: Promise.resolve({ id: 'mid-1' }) });
    expect(requireAdminPageSession).toHaveBeenCalledTimes(1);
  });

  it('chama notFound quando o membro não existe', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(EditMemberPage({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalled();
  });

  it('renderiza o form quando o membro existe', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    const el = await EditMemberPage({ params: Promise.resolve({ id: 'mid-1' }) });
    expect(notFound).not.toHaveBeenCalled();
    expect(el).toBeTruthy();
  });

  it('carrega a conta associada junto do membro', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    await EditMemberPage({ params: Promise.resolve({ id: 'mid-1' }) });
    const args = (prisma.member.findUnique as jest.Mock).mock.calls[0][0];
    expect(args.select.user).toBeTruthy();
    // Nunca a senha, mesmo passando pela relação.
    expect(args.select.user.select.password).toBeUndefined();
  });
});
