import { after } from 'next/server';

/**
 * Runs background work that must survive the response being sent.
 *
 * A bare `void promise` is not enough on serverless: the platform may freeze or
 * recycle the instance as soon as the handler returns, killing any request that
 * is still in flight — which is why Discord error reports were silently lost.
 * `after()` tells the runtime to keep the invocation alive until the work
 * settles, without delaying the response.
 *
 * Errors are swallowed: this is only used for observability, so a failed report
 * must never surface to the caller.
 */
export function runAfterResponse(work: () => Promise<unknown>): void {
  const guarded = () => work().catch(() => {});

  try {
    after(guarded);
  } catch {
    // Outside a request scope (unit tests, scripts) `after()` is unavailable;
    // falling back keeps the side effect without breaking the caller.
    void guarded();
  }
}
