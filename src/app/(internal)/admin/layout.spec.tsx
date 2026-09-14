import AdminLayout from './layout';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { AdminShell } from '@/widgets/admin-shell/admin-shell';

jest.mock('@/shared/lib/page-auth', () => ({
  requirePanelPageSession: jest.fn(),
}));
// Evita carregar a nav (client component) no ambiente node do jest.
jest.mock('@/widgets/admin-shell/admin-shell', () => ({
  AdminShell: () => null,
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    (requirePanelPageSession as jest.Mock).mockResolvedValue({ user: { role: 'admin' } });
  });

  it('exige sessão administrativa', async () => {
    await AdminLayout({ children: null });
    expect(requirePanelPageSession).toHaveBeenCalledTimes(1);
  });

  it('renderiza o AdminShell envolvendo os filhos', async () => {
    const children = 'conteudo';
    const el = await AdminLayout({ children });
    expect(el.type).toBe(AdminShell);
    expect(el.props).toEqual({ children, role: 'admin' });
  });

  it('propaga o redirect do guard sem renderizar', async () => {
    (requirePanelPageSession as jest.Mock).mockRejectedValue(new Error('NEXT_REDIRECT:/login'));
    await expect(AdminLayout({ children: null })).rejects.toThrow('NEXT_REDIRECT:/login');
  });
});
