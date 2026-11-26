/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiClient } from '@/shared/api/api-client';
import { LinkedInReviewDialog } from './linkedin-review-dialog';

jest.mock('@/shared/api/api-client', () => ({
  apiClient: { put: jest.fn(), post: jest.fn() },
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
  destinations: { personal: true },
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
    jest.mocked(apiClient.put).mockResolvedValue({ ok: true, data: { version: 1 } });
  });

  it('saves the draft on cancellation and never sends', async () => {
    const onClose = jest.fn();
    render(
      <LinkedInReviewDialog
        postId="post-1"
        initialReview={initial}
        onClose={onClose}
        onReturnToPosts={jest.fn()}
      />,
    );
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
    render(
      <LinkedInReviewDialog
        postId="post-1"
        initialReview={initial}
        onClose={jest.fn()}
        onReturnToPosts={jest.fn()}
      />,
    );
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
    render(
      <LinkedInReviewDialog
        postId="post-1"
        initialReview={initial}
        onClose={jest.fn()}
        onReturnToPosts={jest.fn()}
      />,
    );
    await screen.findByLabelText('Texto');
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'x'.repeat(3001) } });
    expect(screen.getByText('3.011 de 3.000 caracteres')).toBeTruthy();
    expect(screen.getByText('Remova 11 caracteres para publicar.')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(
      (screen.getByRole('button', { name: 'Confirmar envio' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('shows the composed preview and notifies the editor after a confirmed personal send', async () => {
    const onReturnToPosts = jest.fn();
    const onClose = jest.fn();
    jest.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      data: { review: { ...initial, deliveries: [{ target: 'personal', status: 'succeeded' }] } },
    });
    render(
      <LinkedInReviewDialog
        postId="post-1"
        initialReview={initial}
        onClose={onClose}
        onReturnToPosts={onReturnToPosts}
      />,
    );
    await screen.findByLabelText('Texto');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir prévia' }));
    expect(screen.getByRole('region', { name: 'Prévia de texto' }).textContent).toContain(
      'Texto inicial\n\n#Kiwibit',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fechar prévia' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    await waitFor(() => expect(onReturnToPosts).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(apiClient.put).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open for a confirmed failure and permits a retry', async () => {
    const onReturnToPosts = jest.fn();
    jest.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      data: {
        review: {
          ...initial,
          deliveries: [
            { target: 'personal', status: 'failed', errorCode: 'LINKEDIN_IMAGE_FAILED' },
          ],
        },
      },
    });
    render(
      <LinkedInReviewDialog
        postId="post-1"
        initialReview={initial}
        onClose={jest.fn()}
        onReturnToPosts={onReturnToPosts}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    expect(await screen.findByText(/não foi possível carregar ou enviar a capa/i)).toBeTruthy();
    expect(onReturnToPosts).not.toHaveBeenCalled();
    expect(
      (screen.getByRole('button', { name: 'Confirmar envio' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it.each([
    {
      ok: true,
      data: {
        review: {
          ...initial,
          deliveries: [{ target: 'personal', status: 'unknown', errorCode: 'LINKEDIN_POST_ERROR' }],
        },
      },
    },
    { ok: true, data: { review: null } },
    { ok: false, status: 0, code: 'NETWORK', message: 'Erro de conexão.' },
    { ok: false, status: 500, code: 'INTERNAL', message: 'Erro interno.' },
  ] as const)(
    'returns to the list without a modal error after an uncertain send',
    async (result) => {
      const onReturnToPosts = jest.fn();
      jest.mocked(apiClient.post).mockResolvedValue(result);
      render(
        <LinkedInReviewDialog
          postId="post-1"
          initialReview={initial}
          onClose={jest.fn()}
          onReturnToPosts={onReturnToPosts}
        />,
      );
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar envio' }));
      await waitFor(() => expect(onReturnToPosts).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it('lets the editor load the latest post introductions without discarding them silently', async () => {
    render(
      <LinkedInReviewDialog
        postId="post-1"
        initialReview={{ ...initial, stale: true, suggestedText: 'Nova chamada do post.' }}
        onClose={jest.fn()}
        onReturnToPosts={jest.fn()}
      />,
    );
    await screen.findByLabelText('Texto');
    expect((screen.getByLabelText('Texto') as HTMLTextAreaElement).value).toBe('Texto inicial');
    fireEvent.click(screen.getByRole('button', { name: 'Usar chamadas atuais do post' }));
    expect((screen.getByLabelText('Texto') as HTMLTextAreaElement).value).toBe(
      'Nova chamada do post.',
    );
  });
});
