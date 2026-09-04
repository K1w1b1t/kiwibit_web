import EditUserPage from './page';
import { prisma } from '@/shared/lib/prisma';
import { notFound } from 'next/navigation';
import { requirePanelPageSession } from '@/shared/lib/page-auth';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
jest.mock('@/shared/lib/page-auth', () => ({
  requirePanelPageSession: jest.fn(),
}));
// Componentes client não carregam no ambiente node do jest.
jest.mock('@/features/admin/users/ui/admin-user-form', () => ({
  AdminUserForm: () => null,
}));
jest.mock('@/features/admin/users/ui/user-password-panel', () => ({
  UserPasswordPanel: () => null,
}));
jest.mock('@/shared/ui/delete-button', () => ({
  DeleteButton: () => null,
}));

const USER = { id: 'uid-2', name: 'Alice', email: 'alice@test.com', role: 'member' };

function mockSession(role = 'admin', id = 'uid-1') {
  (requirePanelPageSession as jest.Mock).mockResolvedValue({ user: { id, role } });
}

describe('EditUserPage', () => {
  beforeEach(() => {
    mockSession();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
  });

  it('exige sessão administrativa antes de buscar', async () => {
    await EditUserPage({ params: Promise.resolve({ id: 'uid-2' }) });
    expect(requirePanelPageSession).toHaveBeenCalledTimes(1);
  });

  it('chama notFound quando o usuário não existe', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(EditUserPage({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalled();
  });

  it('não seleciona a coluna password', async () => {
    await EditUserPage({ params: Promise.resolve({ id: 'uid-2' }) });
    const args = (prisma.user.findUnique as jest.Mock).mock.calls[0][0];
    expect(args.select.password).toBeUndefined();
  });

  it('renderiza a tela quando o usuário existe', async () => {
    const el = await EditUserPage({ params: Promise.resolve({ id: 'uid-2' }) });
    expect(el).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('não oferece exclusão da própria conta', async () => {
    mockSession('admin', 'uid-2');
    const el = await EditUserPage({ params: Promise.resolve({ id: 'uid-2' }) });
    expect(el.props.action).toBeUndefined();
  });

  it('oferece exclusão para outras contas', async () => {
    const el = await EditUserPage({ params: Promise.resolve({ id: 'uid-2' }) });
    expect(el.props.action).toBeTruthy();
  });
});
