import { apiError } from '@/shared/lib/api-helpers';

export function postWriteFailure(error: unknown) {
  const invalidMedia = error instanceof Error && error.message === 'POST_MEDIA_UNAVAILABLE';
  return apiError(
    invalidMedia ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
    invalidMedia ? 'One or more images are unavailable for this post.' : 'Could not save the post.',
    invalidMedia ? 400 : 500,
  );
}
