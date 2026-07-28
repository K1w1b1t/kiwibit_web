import {
  ADMIN_ROLES,
  isPrivilegedRole,
  isUserRole,
  ROLE_LABELS,
  USER_ROLES,
} from '@/shared/lib/roles';

describe('isUserRole', () => {
  it.each(USER_ROLES)('aceita %s', (role) => {
    expect(isUserRole(role)).toBe(true);
  });

  it.each(['', 'ADMIN', 'superuser', 'owner'])('rejeita %s', (value) => {
    expect(isUserRole(value)).toBe(false);
  });

  it('rejeita tipos que não são string', () => {
    expect(isUserRole(undefined)).toBe(false);
    expect(isUserRole(null)).toBe(false);
    expect(isUserRole({ role: 'admin' })).toBe(false);
  });
});

describe('ADMIN_ROLES', () => {
  it('inclui admin, editor e member_manager', () => {
    expect([...ADMIN_ROLES].sort()).toEqual(['admin', 'editor', 'member_manager']);
  });

  it('não inclui member', () => {
    expect(ADMIN_ROLES.has('member')).toBe(false);
  });
});

describe('isPrivilegedRole', () => {
  it.each(['admin', 'editor', 'member_manager'] as const)('%s é privilegiada', (role) => {
    expect(isPrivilegedRole(role)).toBe(true);
  });

  it('member não é privilegiada', () => {
    expect(isPrivilegedRole('member')).toBe(false);
  });
});

describe('ROLE_LABELS', () => {
  it('tem rótulo para toda role do schema', () => {
    for (const role of USER_ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });
});
