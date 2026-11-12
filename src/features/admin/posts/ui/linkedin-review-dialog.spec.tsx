/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiClient } from '@/shared/api/api-client';
import { LinkedInReviewDialog } from './linkedin-review-dialog';

jest.mock('@/shared/api/api-client', () => ({
  apiClient: { get: jest.fn(), put: jest.fn(), post: jest.fn() },
}));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));

const initial = {
  text: 'Texto inicial',
  suggestedText: 'Texto inicial',
  hashtags: '#Kiwibit',
  version: 0,
  postUpdatedAt: '2026-01-01T00:00:00.000Z',
  stale: false,
  coverImageUrl: null,
  coverImageAlt: 'Capa do artigo',
  destinations: { company: true, personal: false },
  deliveries: [],
};

describe('LinkedIn review dialog', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
    jest.mocked(apiClient.get).mockResolvedValue({ ok: true, data: initial });
    jest.mocked(apiClient.put).mockResolvedValue({ ok: true, data: { version: 1 } });
  });

  it('saves the draft on cancellation and never sends', async () => {
    const onClose = jest.fn();
    render(<LinkedInReviewDialog postId="post-1" open onClose={onClose} />);
    await screen.findByLabelText('Texto');
    fireEvent.change(screen.getByLabelText('Hashtags'), { target: { value: '#Editada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/admin/posts/post-1/linkedin',
      expect.objectContaining({ hashtags: '#Editada' }),
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('requires confirmation and submits the exact saved version', async () => {
    jest
      .mocked(apiClient.post)
      .mockResolvedValue({ ok: true, data: { review: { ...initial, version: 1 } } });
    render(<LinkedInReviewDialog postId="post-1" open onClose={jest.fn()} />);
    await screen.findByLabelText('Texto');
    const send = screen.getByRole('button', { name: 'Confirmar envio' });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'Texto revisado' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(send);
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/api/admin/posts/post-1/linkedin', {
        version: 1,
        acknowledged: true,
      }),
    );
    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/admin/posts/post-1/linkedin',
      expect.objectContaining({ text: 'Texto revisado' }),
    );
  });

  it('shows validation errors and prevents an oversized post', async () => {
    render(<LinkedInReviewDialog postId="post-1" open onClose={jest.fn()} />);
    await screen.findByLabelText('Texto');
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'x'.repeat(3001) } });
    expect(screen.getByText(/excede o limite do perfil/)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Confirmar envio' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('lets the editor load the latest post introductions without discarding them silently', async () => {
    jest.mocked(apiClient.get).mockResolvedValue({
      ok: true,
      data: { ...initial, stale: true, suggestedText: 'Nova chamada do post.' },
    });
    render(<LinkedInReviewDialog postId="post-1" open onClose={jest.fn()} />);
    await screen.findByLabelText('Texto');
    expect((screen.getByLabelText('Texto') as HTMLTextAreaElement).value).toBe('Texto inicial');
    fireEvent.click(screen.getByRole('button', { name: 'Usar chamadas atuais do post' }));
    expect((screen.getByLabelText('Texto') as HTMLTextAreaElement).value).toBe(
      'Nova chamada do post.',
    );
  });
});
