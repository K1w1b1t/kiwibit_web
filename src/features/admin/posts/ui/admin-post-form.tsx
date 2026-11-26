'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PostTranslations } from '@/entities/post/model/localized-post';
import type { PostStatus } from '@prisma/client';
import { apiClient } from '@/shared/api/api-client';
import type { LinkedInReview } from '@/features/admin/posts/model/linkedin-publication';
import {
  EMPTY_POST_FIELD_ERRORS,
  validatePost,
  type PostFieldErrors,
  type PostFormValues,
} from '@/features/admin/posts/model/validate-post';
import {
  toCreatePostPayload,
  toUpdatePostPayload,
} from '@/features/admin/posts/model/post-payload';
import { useResourceForm } from '@/shared/hooks/use-resource-form';
import { POST_STATUS_LABELS, POST_STATUSES } from '@/shared/lib/post-status';
import { captureAnalyticsEvent } from '@/shared/lib/analytics';
import { Button } from '@/shared/ui/button';
import { FormStatus } from '@/shared/ui/form-status';
import { ImageUploadField } from '@/shared/ui/image-upload-field';
import { SelectField } from '@/shared/ui/select-field';
import { RichTextField } from '@/shared/ui/rich-text-field';
import { TextPreviewField } from '@/shared/ui/text-preview-field';
import { LINKEDIN_PERSONAL_CHARACTER_LIMIT } from '@/shared/lib/linkedin-commentary';
import { textToHtml } from '@/shared/lib/rich-text';
import { TextField } from '@/shared/ui/text-field';
import { LinkedInReviewDialog } from './linkedin-review-dialog';

export type PostInitial = PostTranslations & {
  contentFormat?: 'text' | 'html' | 'markdown';
  id: string;
  title: string;
  content: string;
  status: PostStatus;
  coverImageUrl: string | null;
  coverImagePath: string | null;
  coverImageAlt: string | null;
  linkedinIntroPt?: string | null;
  linkedinIntroEn?: string | null;
};

type Props = {
  initial?: PostInitial;
  canPublish?: boolean;
  hasLinkedInProfile?: boolean;
};

function toFormValues(initial?: PostInitial): PostFormValues {
  const content = (value: string) =>
    !value
      ? ''
      : initial?.contentFormat === 'html' || initial?.contentFormat === 'markdown'
        ? value
        : textToHtml(value);
  return {
    contentFormat: 'markdown',
    linkedinIntroPt: initial?.linkedinIntroPt ?? '',
    linkedinIntroEn: initial?.linkedinIntroEn ?? '',
    titlePt: initial?.titlePt ?? (initial?.titleEn ? '' : (initial?.title ?? '')),
    titleEn: initial?.titleEn ?? '',
    contentPt: content(initial?.contentPt ?? (initial?.contentEn ? '' : (initial?.content ?? ''))),
    contentEn: content(initial?.contentEn ?? ''),
    coverImageAltPt: initial?.coverImageAltPt ?? initial?.coverImageAlt ?? '',
    coverImageAltEn: initial?.coverImageAltEn ?? '',
    title: initial?.title ?? '',
    content: content(initial?.content ?? ''),
    // New posts start as drafts so nothing goes live by accident.
    status: initial?.status ?? 'draft',
    coverImageUrl: initial?.coverImageUrl ?? '',
    coverImagePath: initial?.coverImagePath ?? '',
    coverImageAlt: initial?.coverImageAlt ?? '',
  };
}

export function AdminPostForm({
  initial,
  canPublish = true,
  hasLinkedInProfile = false,
}: Readonly<Props>) {
  const router = useRouter();
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const isUploading = Object.values(uploads).some(Boolean);
  const isEdit = initial !== undefined;
  const [form, setForm] = useState<PostFormValues>(() => toFormValues(initial));
  const [lastStatus, setLastStatus] = useState<PostStatus>(initial?.status ?? 'draft');
  const [profileAvailability, setProfileAvailability] = useState<boolean>();
  const [review, setReview] = useState<{ postId: string; data: LinkedInReview } | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const reviewButtonRef = useRef<HTMLButtonElement>(null);
  const reviewTriggerRef = useRef<'save' | 'review'>('save');
  const statusOptions = POST_STATUSES.map((status) => ({
    value: status,
    label: POST_STATUS_LABELS[status],
    disabled: status === 'published' && !canPublish,
  }));

  async function openLinkedInReview(postId: string, trigger: 'save' | 'review') {
    setReviewError('');
    setIsReviewLoading(true);
    try {
      const result = await apiClient.get<LinkedInReview>(`/api/admin/posts/${postId}/linkedin`);
      if (result.ok) {
        setProfileAvailability(result.data.destinations.personal);
        if (result.data.deliveries.some((delivery) => delivery.status === 'unknown')) {
          router.replace('/admin/posts');
          return;
        }
        if (result.data.destinations.personal) {
          reviewTriggerRef.current = trigger;
          setReview({ postId, data: result.data });
          return;
        }
        if (trigger === 'save') router.replace('/admin/posts');
      } else if (!isEdit) {
        router.replace('/admin/posts');
      } else {
        setReviewError(result.message);
      }
    } finally {
      setIsReviewLoading(false);
    }
  }

  const { status, message, fieldErrors, isSubmitting, submit } = useResourceForm<
    PostFormValues,
    unknown,
    PostFieldErrors,
    PostInitial
  >({
    validate: validatePost,
    toPayload: (values) =>
      isEdit
        ? toUpdatePostPayload(values as PostFormValues & { status: PostStatus })
        : toCreatePostPayload(values as PostFormValues & { status: PostStatus }),
    method: isEdit ? 'PUT' : 'POST',
    endpoint: isEdit ? `/api/admin/posts/${initial.id}` : '/api/admin/posts',
    successMessage: isEdit ? 'Alterações salvas.' : 'Post criado com sucesso.',
    emptyFieldErrors: EMPTY_POST_FIELD_ERRORS,
    onSuccess: (post) => {
      setLastStatus(post.status);
      if (!isEdit) captureAnalyticsEvent('post_created');

      if (canPublish && post.status === 'published' && lastStatus !== 'published') {
        void openLinkedInReview(post.id, 'save');
      } else if (!isEdit) {
        router.replace('/admin/posts');
      }
    },
  });

  const isFormLocked = isSubmitting || isReviewLoading || (!isEdit && status === 'success');

  function update<K extends keyof PostFormValues>(field: K, value: PostFormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const idPrefix = isEdit ? 'edit-post' : 'new-post';

  return (
    <div className="card-glow animate-fade-up delay-100 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm sm:p-6">
      <FormStatus status={status} message={message} />
      {reviewError && (
        <p role="alert" className="mb-4 text-sm text-amber-200">
          {reviewError}
        </p>
      )}

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!isUploading && !isFormLocked) {
            setReviewError('');
            void submit(form);
          }
        }}
        className="space-y-4"
      >
        <p className="text-sm text-white/60">
          Preencha título e conteúdo em pelo menos um idioma. A tradução ausente usa o outro idioma.
        </p>
        {(['Pt', 'En'] as const).map((language) => (
          <fieldset
            key={language}
            className="min-w-0 space-y-4 rounded-xl border border-white/10 p-3 sm:p-4"
          >
            <legend className="px-2 font-semibold">
              {language === 'Pt' ? 'Português' : 'Inglês'}
            </legend>
            <TextField
              id={`${idPrefix}-title-${language}`}
              label="Título"
              value={form[`title${language}`] ?? ''}
              onChange={(event) => update(`title${language}`, event.target.value)}
              disabled={isFormLocked}
              error={fieldErrors[`title${language}`]}
            />
            <RichTextField
              id={`${idPrefix}-content-${language}`}
              label="Conteúdo"
              postId={initial?.id}
              onUploadingChange={(busy) =>
                setUploads((current) => ({ ...current, [language]: busy }))
              }
              value={form[`content${language}`] ?? ''}
              onChange={(markdown) => update(`content${language}`, markdown)}
              disabled={isFormLocked}
              error={fieldErrors[`content${language}`]}
            />
            <TextPreviewField
              id={`${idPrefix}-linkedin-${language}`}
              label={`Chamada para o LinkedIn (${language === 'Pt' ? 'português' : 'inglês'}) — opcional`}
              maxLength={LINKEDIN_PERSONAL_CHARACTER_LIMIT}
              value={form[`linkedinIntro${language}`] ?? ''}
              onChange={(value) => update(`linkedinIntro${language}`, value)}
              disabled={isFormLocked}
              error={fieldErrors[`linkedinIntro${language}`]}
              preview={
                <p className="whitespace-pre-wrap">
                  {form[`linkedinIntro${language}`] || 'Nenhuma chamada escrita.'}
                </p>
              }
            />
            <TextField
              id={`${idPrefix}-alt-${language}`}
              label="Texto alternativo da capa"
              value={form[`coverImageAlt${language}`] ?? ''}
              onChange={(event) => update(`coverImageAlt${language}`, event.target.value)}
              disabled={isFormLocked}
              error={fieldErrors[`coverImageAlt${language}`]}
            />
          </fieldset>
        ))}
        {fieldErrors.title && (
          <p role="alert" className="text-sm text-amber-200">
            {fieldErrors.title}
          </p>
        )}

        <SelectField
          id={`${idPrefix}-status`}
          label="Status"
          required
          options={statusOptions}
          value={form.status}
          onChange={(event) => update('status', event.target.value)}
          disabled={isFormLocked}
          error={fieldErrors.status}
          hint="Rascunho não aparece no blog público."
          className="animate-fade-up delay-200"
        />

        <div className="animate-fade-up delay-400 space-y-3">
          <ImageUploadField
            id={`${idPrefix}-cover`}
            label="Imagem de capa"
            scope="posts"
            postId={initial?.id}
            shape="wide"
            disabled={isFormLocked}
            error={fieldErrors.coverImageUrl}
            value={{ url: form.coverImageUrl, path: form.coverImagePath }}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                coverImageUrl: next.url,
                coverImagePath: next.path,
              }))
            }
          />
        </div>

        <div className="animate-fade-up delay-500 pt-2">
          <Button
            ref={saveButtonRef}
            disabled={isUploading || isFormLocked}
            type="submit"
            isLoading={isSubmitting}
            loadingLabel={isEdit ? 'Salvando...' : 'Criando...'}
          >
            {isEdit ? 'Salvar alterações' : 'Criar post'}
          </Button>
        </div>
      </form>
      {canPublish &&
        initial &&
        lastStatus === 'published' &&
        (profileAvailability ?? hasLinkedInProfile) && (
          <div className="mt-4">
            <Button
              ref={reviewButtonRef}
              variant="outline"
              disabled={isFormLocked}
              isLoading={isReviewLoading}
              loadingLabel="Carregando revisão..."
              onClick={() => void openLinkedInReview(initial.id, 'review')}
            >
              Publicar no LinkedIn
            </Button>
          </div>
        )}
      {review && (
        <LinkedInReviewDialog
          postId={review.postId}
          initialReview={review.data}
          onReturnToPosts={() => {
            setReview(null);
            router.replace('/admin/posts');
          }}
          onClose={() => {
            setReview(null);
            if (!isEdit) {
              router.replace('/admin/posts');
              return;
            }
            requestAnimationFrame(() => {
              const button =
                reviewTriggerRef.current === 'review'
                  ? reviewButtonRef.current
                  : saveButtonRef.current;
              button?.focus();
            });
          }}
        />
      )}
    </div>
  );
}
