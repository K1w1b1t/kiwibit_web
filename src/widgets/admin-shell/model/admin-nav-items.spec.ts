import {
  ADMIN_NAV_ITEMS,
  isActiveNavItem,
  isVisibleNavItem,
  type AdminNavItem,
} from '@/widgets/admin-shell/model/admin-nav-items';

const DASHBOARD: AdminNavItem = { label: 'Dashboard', href: '/admin', exact: true };
const MEMBERS: AdminNavItem = { label: 'Equipe', href: '/admin/members' };

describe('isActiveNavItem', () => {
  it.each([
    ['/admin', true],
    ['/admin/members', false],
    ['/admin/members/new', false],
  ])('dashboard casa apenas exatamente: %s -> %s', (pathname, expected) => {
    expect(isActiveNavItem(pathname, DASHBOARD)).toBe(expected);
  });

  it.each([
    ['/admin/members', true],
    ['/admin/members/new', true],
    ['/admin/members/abc/edit', true],
    ['/admin', false],
    ['/admin/membersXYZ', false],
  ])('seção casa por prefixo de segmento: %s -> %s', (pathname, expected) => {
    expect(isActiveNavItem(pathname, MEMBERS)).toBe(expected);
  });
});

describe('ADMIN_NAV_ITEMS', () => {
  it('só contém rotas sob /admin', () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(item.href.startsWith('/admin')).toBe(true);
    }
  });

  it('não tem hrefs duplicados', () => {
    const hrefs = ADMIN_NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('restringe itens administrativos ao member', () => {
    const visible = ADMIN_NAV_ITEMS.filter((item) => isVisibleNavItem('member', item));
    expect(visible.map((item) => item.href)).toEqual(['/admin', '/admin/posts', '/admin/users']);
  });

  it('mostra itens restritos para roles administrativas', () => {
    for (const role of ['admin', 'editor', 'member_manager'] as const) {
      expect(ADMIN_NAV_ITEMS.filter((item) => isVisibleNavItem(role, item))).toHaveLength(
        ADMIN_NAV_ITEMS.length,
      );
    }
  });
});
