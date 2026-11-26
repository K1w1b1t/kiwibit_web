'use client';

import { useState } from 'react';
import Image from 'next/image';
import { apiClient } from '@/shared/api/api-client';
import { LINKEDIN_PERSONAL_CHARACTER_LIMIT } from '@/shared/lib/linkedin-commentary';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';
import { TextPreviewField } from '@/shared/ui/text-preview-field';
import type { LinkedInReview } from '@/features/admin/posts/model/linkedin-publication';
import { composeLinkedInReview } from '@/features/admin/posts/model/linkedin-review';

const ERROR_MESSAGES: Record<string, string> = {
  LINKEDIN_IMAGE_FAILED:
    'Não foi possível carregar ou enviar a capa. Verifique a imagem e tente novamente.',
  LINKEDIN_TOKEN_EXPIRED:
    'A conexão com o LinkedIn expirou. Reconecte a conta antes de tentar novamente.',
  LINKEDIN_DESTINATION_CHANGED:
    'O destino mudou durante a revisão. Confira a conexão e tente novamente.',
  LINKEDIN_POST_FAILED:
    'O LinkedIn recusou a publicação. Verifique as permissões e tente novamente.',
};

export function LinkedInReviewDialog({
  postId,
  initialReview,
  onClose,
  onReturnToPosts,
}: Readonly<{
  postId: string;
  initialReview: LinkedInReview;
  onClose: () => void;
  onReturnToPosts: () => void;
}>) {
  const [review, setReview] = useState(initialReview);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const composition = composeLinkedInReview(review.text, review.hashtags);
  const blocked = review.deliveries.some(
    (delivery) =>
      delivery.status === 'sending' ||
      delivery.status === 'unknown' ||
      delivery.status === 'succeeded',
  );

  async function save() {
    const result = await apiClient.put<{ version: number }>(`/api/admin/posts/${postId}/linkedin`, {
      version: review.version,
      text: review.text,
      hashtags: review.hashtags,
      postUpdatedAt: review.postUpdatedAt,
    });
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    const saved = { ...review, version: result.data.version, stale: false };
    setReview(saved);
    return saved;
  }

  async function cancel() {
    if (blocked) {
      onClose();
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (await save()) onClose();
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!review.destinations.personal || !composition.valid || !acknowledged || busy || blocked)
      return;
    setBusy(true);
    setError('');
    try {
      const saved = await save();
      if (!saved) return;
      const result = await apiClient.post<{ review: LinkedInReview | null }>(
        `/api/admin/posts/${postId}/linkedin`,
        {
          version: saved.version,
          acknowledged,
        },
      );
      if (!result.ok) {
        if (result.status === 0 || result.status >= 500) onReturnToPosts();
        else setError(result.message);
        return;
      }
      const nextReview = result.data?.review;
      if (
        !nextReview ||
        nextReview.deliveries.some(
          (delivery) =>
            delivery.target === 'personal' &&
            (delivery.status === 'succeeded' || delivery.status === 'unknown'),
        )
      ) {
        onReturnToPosts();
        return;
      }
      setReview(nextReview);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open
      width="wide"
      title="Revisar publicação no LinkedIn"
      description="O artigo já está publicado no blog. Cancelar não envia ao LinkedIn."
      confirmLabel="Confirmar envio"
      loadingLabel="Enviando..."
      cancelLabel="Cancelar"
      confirmVariant="solid"
      isBusy={busy}
      confirmDisabled={
        !composition.valid || !acknowledged || blocked || !review.destinations.personal
      }
      onCancel={() => void cancel()}
      onConfirm={() => void confirm()}
    >
      <div className="mt-4 space-y-4">
        <TextPreviewField
          id="linkedin-review-text"
          label="Texto"
          autoFocus
          value={review.text}
          describedBy="linkedin-validation"
          disabled={busy || blocked}
          onChange={(text) => setReview({ ...review, text })}
          preview={
            <div className="space-y-4">
              {composition.valid && <p className="whitespace-pre-wrap">{composition.text}</p>}
              {review.coverImageUrl ? (
                <Image
                  unoptimized
                  width={900}
                  height={400}
                  src={review.coverImageUrl}
                  alt={review.coverImageAlt}
                  className="max-h-72 w-full rounded-lg bg-black/30 object-contain"
                />
              ) : (
                <p className="text-sm text-white/60">Esta publicação será enviada sem imagem.</p>
              )}
            </div>
          }
        />
        <TextField
          id="linkedin-review-hashtags"
          label="Hashtags"
          value={review.hashtags}
          aria-describedby="linkedin-validation"
          disabled={busy || blocked}
          onChange={(event) => setReview({ ...review, hashtags: event.target.value })}
        />
        <p
          id="linkedin-validation"
          aria-live="polite"
          className={composition.valid ? 'text-sm text-white/70' : 'text-sm text-amber-200'}
        >
          {composition.length !== undefined && (
            <span className="block">
              {composition.length.toLocaleString('pt-BR')} de{' '}
              {LINKEDIN_PERSONAL_CHARACTER_LIMIT.toLocaleString('pt-BR')} caracteres
            </span>
          )}
          {!composition.valid && composition.error}
        </p>
        {review.stale && (
          <div role="status">
            <p>
              O artigo mudou desde a revisão anterior; confira a capa e o texto antes de confirmar.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || blocked}
              onClick={() => setReview({ ...review, text: review.suggestedText })}
            >
              Usar chamadas atuais do post
            </Button>
          </div>
        )}
        {review.deliveries.map((delivery) => (
          <p key={delivery.target} role="status">
            Perfil pessoal:{' '}
            {(
              {
                succeeded: 'enviado',
                failed: 'falhou',
                sending: 'enviando',
              } as Record<string, string>
            )[delivery.status] ?? delivery.status}
            {delivery.errorCode
              ? ` — ${ERROR_MESSAGES[delivery.errorCode] ?? 'Não foi possível concluir o envio.'}`
              : ''}
          </p>
        ))}
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={acknowledged}
            disabled={busy || blocked}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          Confirmei o conteúdo e verifiquei possíveis publicações anteriores no LinkedIn.
        </label>
      </div>
      {error && (
        <div className="mt-3">
          <p role="alert" className="text-amber-200">
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Fechar sem salvar
          </Button>
        </div>
      )}
    </ConfirmDialog>
  );
}
