import EditMemberPage from './page';
import { prisma } from '@/shared/lib/prisma';
import { notFound } from 'next/navigation';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
// Evita carregar o componente client no ambiente node do jest.
jest.mock('@/features/admin/members/ui/admin-member-edit-form', () => ({
  AdminMemberEditForm: () => null,
}));

const MEMBER = { id: 'mid-1', name: 'Alice', bio: 'Dev', avatarUrl: null };

describe('EditMemberPage', () => {
  it('chama notFound quando o membro não existe', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(EditMemberPage({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalled();
  });

  it('renderiza o form quando o membro existe', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    const el = await EditMemberPage({ params: Promise.resolve({ id: 'mid-1' }) });
    expect(notFound).not.toHaveBeenCalled();
    expect(el).toBeTruthy();
  });
});
