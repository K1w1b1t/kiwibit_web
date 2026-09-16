import type { Instrumentation } from 'next';

/**
 * Catches unhandled exceptions thrown from route handlers and RSC rendering
 * (which bypass `apiError`) and forwards them to the Discord error webhook.
 * No-op when DISCORD_ERROR_WEBHOOK_URL is unset.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  const [{ reportServerError }, { captureServerException }] = await Promise.all([
    import('@/shared/lib/discord'),
    import('@/shared/lib/server-analytics'),
  ]);
  const message = err instanceof Error ? err.message : String(err);
  await Promise.allSettled([
    reportServerError({
      source: request.path.split('?')[0],
      method: request.method,
      message,
      status: 500,
    }),
    captureServerException(err, request.path, request.method),
  ]);
};
