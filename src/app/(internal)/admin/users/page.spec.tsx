import UsersPage from './page';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { redirect } from 'next/navigation';

jest.mock('@/shared/lib/page-auth', () => ({ requirePanelPageSession: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('redirect');
  }),
}));

it('guards and redirects the old users list to members', async () => {
  await expect(UsersPage()).rejects.toThrow('redirect');
  expect(requirePanelPageSession).toHaveBeenCalled();
  expect(redirect).toHaveBeenCalledWith('/admin/members');
});
