'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { apiClient } from '@/shared/api/api-client';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Button } from '@/shared/ui/button';
import { composeLinkedInReview } from '@/features/admin/posts/model/linkedin-review';

type Review = {
  text: string;
  suggestedText: string;
  hashtags: string;
  version: number;
  postUpdatedAt: string;
  stale: boolean;
  coverImageUrl: string | null;
  coverImageAlt: string;
  destinations: { company: boolean; personal: boolean };
  deliveries: { target: string; status: string; errorCode: string | null }[];
};

const ERROR_MESSAGES: Record<string, string> = {
  LINKEDIN_IMAGE_FAILED:
    'Não foi possível carregar ou enviar a capa. Verifique a imagem e tente novamente.',
  LINKEDIN_TOKEN_EXPIRED:
    'A conexão com o LinkedIn expirou. Reconecte a conta antes de tentar novamente.',
  LINKEDIN_DESTINATION_CHANGED:
    'O destino mudou durante a revisão. Confira a conexão e tente novamente.',
  LINKEDIN_POST_FAILED:
    'O LinkedIn recusou a publicação. Verifique as permissões e tente novamente.',
  LINKEDIN_POST_ERROR:
    'Não foi possível confirmar o resultado. Verifique a publicação no LinkedIn.',
  LINKEDIN_RESULT_UNKNOWN:
    'O resultado é incerto. Verifique a publicação no LinkedIn antes de outra tentativa.',
};

export function LinkedInReviewDialog({
  postId,
  open,
  onClose,
}: Readonly<{
  postId: string;
  open: boolean;
  onClose: () => void;
}>) {
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void apiClient.get<Review>(`/api/admin/posts/${postId}/linkedin`).then((result) => {
      if (!active) return;
      if (result.ok) setReview(result.data);
      else setError(result.message);
    });
    return () => {
      active = false;
    };
  }, [open, postId]);

  const composition = review ? composeLinkedInReview(review.text, review.hashtags) : null;
  const blocked = review?.deliveries.some(
    (delivery) => delivery.status === 'sending' || delivery.status === 'unknown',
  );

  async function save() {
    if (!review) return null;
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
    if (!review || blocked) {
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
    if (!review || !composition?.valid || !acknowledged || busy) return;
    setBusy(true);
    setError('');
    try {
      const saved = await save();
      if (!saved) return;
      const result = await apiClient.post<{ review: Review }>(
        `/api/admin/posts/${postId}/linkedin`,
        {
          version: saved.version,
          acknowledged,
        },
      );
      if (!result.ok) setError(result.message);
      else setReview(result.data.review);
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-white/20 bg-black/30 p-3 text-white';
  return (
    <ConfirmDialog
      open={open}
      title="Revisar publicação no LinkedIn"
      description="O artigo já está publicado no blog. Cancelar não envia ao LinkedIn."
      confirmLabel="Confirmar envio"
      loadingLabel="Enviando..."
      cancelLabel="Cancelar"
      confirmVariant="solid"
      isBusy={busy}
      confirmDisabled={
        !review ||
        !composition?.valid ||
        !acknowledged ||
        blocked ||
        (!review.destinations.company && !review.destinations.personal)
      }
      onCancel={() => void cancel()}
      onConfirm={() => void confirm()}
    >
      {!review && !error && (
        <p role="status" className="mt-4">
          Carregando revisão...
        </p>
      )}
      {review && (
        <div className="mt-4 space-y-4">
          {review.coverImageUrl ? (
            <Image
              unoptimized
              width={900}
              height={400}
              src={review.coverImageUrl}
              alt={review.coverImageAlt}
              className="max-h-48 w-full rounded-lg object-cover"
            />
          ) : (
            <p>Esta publicação será enviada sem imagem.</p>
          )}
          <label className="block">
            Texto
            <textarea
              autoFocus
              rows={8}
              className={inputClass}
              value={review.text}
              aria-describedby="linkedin-validation"
              disabled={busy || blocked}
              onChange={(event) => setReview({ ...review, text: event.target.value })}
            />
          </label>
          <label className="block">
            Hashtags
            <input
              className={inputClass}
              value={review.hashtags}
              aria-describedby="linkedin-validation"
              disabled={busy || blocked}
              onChange={(event) => setReview({ ...review, hashtags: event.target.value })}
            />
          </label>
          <div id="linkedin-validation" aria-live="polite">
            {composition?.valid
              ? `${composition.companyLength}/1500 caracteres para a página da empresa`
              : composition?.error}
          </div>
          {composition?.valid && (
            <div>
              <p>Prévia final:</p>
              <p className="whitespace-pre-wrap rounded-lg bg-black/30 p-3">{composition.text}</p>
            </div>
          )}
          <p>
            Página da empresa: {review.destinations.company ? 'disponível' : 'indisponível'} ·
            Perfil do autor: {review.destinations.personal ? 'disponível' : 'indisponível'}
          </p>
          {review.stale && (
            <div role="status">
              <p>
                O artigo mudou desde a revisão anterior; confira a capa e o texto antes de
                confirmar.
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
              {delivery.target === 'company' ? 'Empresa' : 'Perfil'}:{' '}
              {(
                {
                  succeeded: 'enviado',
                  failed: 'falhou',
                  sending: 'enviando',
                  unknown: 'resultado incerto: verifique no LinkedIn antes de nova tentativa',
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
      )}
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
