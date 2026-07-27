import LoginPage from './page';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/shared/lib/auth', () => ({ authOptions: {} }));
// Evita carregar next-auth/react (client) no ambiente node do jest.
jest.mock('@/features/auth/ui/login-form', () => ({ LoginForm: () => null }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

describe('LoginPage', () => {
  it('redireciona para /admin quando já há sessão', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'member' } });
    await expect(LoginPage()).rejects.toThrow('NEXT_REDIRECT:/admin');
    expect(redirect).toHaveBeenCalledWith('/admin');
  });

  it('renderiza a página sem sessão', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const el = await LoginPage();
    expect(redirect).not.toHaveBeenCalled();
    expect(el).toBeTruthy();
  });
});
