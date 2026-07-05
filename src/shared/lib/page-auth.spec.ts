import { requireAdminPageSession } from './page-auth';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/shared/lib/auth', () => ({ authOptions: {} }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    // Emula o next real: redirect() lança e interrompe o fluxo.
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

function sessionWithRole(role: string) {
  return { user: { id: 'u1', name: 'User', email: 'u@test.com', role } };
}

describe('requireAdminPageSession', () => {
  it('redireciona para /login quando não há sessão', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    await expect(requireAdminPageSession()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('redireciona para / quando a role não é administrativa', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionWithRole('member'));
    await expect(requireAdminPageSession()).rejects.toThrow('NEXT_REDIRECT:/');
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it.each(['admin', 'editor', 'member_manager'])('retorna a sessão para role %s', async (role) => {
    const session = sessionWithRole(role);
    (getServerSession as jest.Mock).mockResolvedValue(session);
    await expect(requireAdminPageSession()).resolves.toBe(session);
    expect(redirect).not.toHaveBeenCalled();
  });
});
