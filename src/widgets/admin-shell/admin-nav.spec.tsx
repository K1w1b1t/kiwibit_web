import { AdminNav } from './admin-nav';

jest.mock('next/navigation', () => ({ usePathname: () => '/admin' }));
jest.mock('@/features/auth/ui/sign-out-button', () => ({ SignOutButton: () => null }));

describe('AdminNav', () => {
  it.each(['admin', 'editor', 'member_manager', 'member'] as const)(
    'keeps account access without a separate connections entry for %s',
    (role) => {
      const element = AdminNav({ role });
      const shell = element.props.children;
      const nav = shell.props.children[1];
      const links = nav.props.children as Array<{ props: { children: string; href: string } }>;

      expect(links.map((link) => link.props.children)).toContain('Equipe');
      expect(links.map((link) => link.props.children)).not.toContain('Minhas conexões');
      expect(links.map((link) => link.props.href)).not.toContain('/admin/connections');
      expect(shell.props.children[2].props).toMatchObject({
        href: '/admin/account',
        children: 'Minha conta',
      });
    },
  );
});
