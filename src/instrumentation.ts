import type { Instrumentation } from 'next';

/**
 * Catches unhandled exceptions thrown from route handlers and RSC rendering
 * (which bypass `apiError`) and forwards them to the Discord error webhook.
 * No-op when DISCORD_ERROR_WEBHOOK_URL is unset.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  const { reportServerError } = await import('@/shared/lib/discord');
  const message = err instanceof Error ? err.message : String(err);
  await reportServerError({
    source: request.path,
    method: request.method,
    message,
    status: 500,
  });
};
