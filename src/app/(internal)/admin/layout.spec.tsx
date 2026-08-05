import AdminLayout from './layout';
import { requireAdminPageSession } from '@/shared/lib/page-auth';
import { AdminShell } from '@/widgets/admin-shell/admin-shell';

jest.mock('@/shared/lib/page-auth', () => ({
  requireAdminPageSession: jest.fn(),
}));
// Evita carregar a nav (client component) no ambiente node do jest.
jest.mock('@/widgets/admin-shell/admin-shell', () => ({
  AdminShell: () => null,
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    (requireAdminPageSession as jest.Mock).mockResolvedValue({ user: { role: 'admin' } });
  });

  it('exige sessão administrativa', async () => {
    await AdminLayout({ children: null });
    expect(requireAdminPageSession).toHaveBeenCalledTimes(1);
  });

  it('renderiza o AdminShell envolvendo os filhos', async () => {
    const children = 'conteudo';
    const el = await AdminLayout({ children });
    expect(el.type).toBe(AdminShell);
    expect(el.props).toEqual({ children });
  });

  it('propaga o redirect do guard sem renderizar', async () => {
    (requireAdminPageSession as jest.Mock).mockRejectedValue(new Error('NEXT_REDIRECT:/login'));
    await expect(AdminLayout({ children: null })).rejects.toThrow('NEXT_REDIRECT:/login');
  });
});
