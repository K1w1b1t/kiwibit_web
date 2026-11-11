import EditMemberPage from './page';
import { prisma } from '@/shared/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { MemberMcpPanel } from '@/features/mcp-connections/ui/member-mcp-panel';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
jest.mock('@/shared/lib/page-auth', () => ({
  requirePanelPageSession: jest.fn(),
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
    (requirePanelPageSession as jest.Mock).mockResolvedValue({
      user: { id: 'uid-1', role: 'admin' },
    });
  });

  it('exige sessão administrativa antes de buscar o membro', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    await EditMemberPage({ params: Promise.resolve({ id: 'mid-1' }) });
    expect(requirePanelPageSession).toHaveBeenCalledTimes(1);
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

  it('does not offer role editing for the signed-in administrator', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      ...MEMBER,
      user: { id: 'uid-1', name: 'Admin', email: 'admin@test.com', role: 'admin' },
    });
    const page = await EditMemberPage({ params: Promise.resolve({ id: 'mid-1' }) });
    expect(page.props.children[1].props.canChangeRole).toBe(false);
  });

  it('offers role editing to an administrator managing another account', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      ...MEMBER,
      user: { id: 'uid-2', name: 'Alice', email: 'alice@test.com', role: 'member' },
    });
    const page = await EditMemberPage({ params: Promise.resolve({ id: 'mid-1' }) });
    expect(page.props.children[1].props.canChangeRole).toBe(true);
  });

  it('redirects a member away from another member profile', async () => {
    (requirePanelPageSession as jest.Mock).mockResolvedValue({
      user: { id: 'uid-member', role: 'member' },
    });
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      ...MEMBER,
      user: { id: 'uid-other', email: 'other@test.com', role: 'member' },
    });

    await expect(EditMemberPage({ params: Promise.resolve({ id: 'mid-1' }) })).rejects.toThrow(
      'NEXT_REDIRECT:/admin/members',
    );
    expect(redirect).toHaveBeenCalledWith('/admin/members');
  });

  it('offers MCP controls only on the signed-in member account', async () => {
    (requirePanelPageSession as jest.Mock).mockResolvedValue({
      user: { id: 'owner', role: 'member' },
    });
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      ...MEMBER,
      user: { id: 'owner', role: 'member' },
    });
    const page = await EditMemberPage({ params: Promise.resolve({ id: 'mid-1' }) });
    expect(page.props.children.at(-1).type).toBe(MemberMcpPanel);
  });

  it('does not expose the administrator MCP controls while editing another member', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      ...MEMBER,
      user: { id: 'other', role: 'member' },
    });
    const page = await EditMemberPage({ params: Promise.resolve({ id: 'mid-1' }) });
    expect(page.props.children.at(-1)).toBe(false);
  });
});
