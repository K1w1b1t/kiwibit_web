import { AdminNav } from './admin-nav';

jest.mock('next/navigation', () => ({ usePathname: () => '/admin' }));
jest.mock('@/features/auth/ui/sign-out-button', () => ({ SignOutButton: () => null }));

describe('AdminNav', () => {
  it('includes the members section for a member role', () => {
    const element = AdminNav({ role: 'member' });
    const shell = element.props.children;
    const nav = shell.props.children[1];
    const links = nav.props.children as Array<{ props: { children: string } }>;

    expect(links).toHaveLength(4);
    expect(links.map((link) => link.props.children)).toContain('Equipe');
  });
});
