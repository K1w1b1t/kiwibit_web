import EditUserPage from './page';
import { prisma } from '@/shared/lib/prisma';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { redirect } from 'next/navigation';

jest.mock('@/shared/lib/page-auth', () => ({ requirePanelPageSession: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('redirect');
  }),
  notFound: jest.fn(() => {
    throw new Error('not found');
  }),
}));

beforeEach(() => {
  (requirePanelPageSession as jest.Mock).mockResolvedValue({ user: { id: 'self', role: 'admin' } });
});

it('redirects linked accounts to their member', async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ member: { id: 'member-1' } });
  await expect(EditUserPage({ params: Promise.resolve({ id: 'user-1' }) })).rejects.toThrow(
    'redirect',
  );
  expect(redirect).toHaveBeenCalledWith('/admin/members/member-1/edit');
});
it('redirects the unlinked current account to my account', async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ member: null });
  await expect(EditUserPage({ params: Promise.resolve({ id: 'self' }) })).rejects.toThrow(
    'redirect',
  );
  expect(redirect).toHaveBeenCalledWith('/admin/account');
});
it('denies a member access to another account', async () => {
  (requirePanelPageSession as jest.Mock).mockResolvedValue({
    user: { id: 'self', role: 'member' },
  });
  await expect(EditUserPage({ params: Promise.resolve({ id: 'other' }) })).rejects.toThrow(
    'redirect',
  );
  expect(redirect).toHaveBeenCalledWith('/admin/members');
  expect(prisma.user.findUnique).not.toHaveBeenCalled();
});
