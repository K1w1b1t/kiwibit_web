import { PostHog } from 'posthog-node';

export async function captureServerException(error: unknown, path: string, method: string) {
  const token = process.env.POSTHOG_PROJECT_TOKEN;
  if (!token) return false;
  const client = new PostHog(token, {
    host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  });
  try {
    await client.captureExceptionImmediate(error, undefined, {
      app: 'kiwibit',
      environment: process.env.POSTHOG_ENVIRONMENT ?? 'development',
      telemetry_source: 'server',
      path: path.split('?')[0],
      method,
      $process_person_profile: false,
    });
    await client.shutdown();
    return true;
  } catch {
    return false;
  }
}
