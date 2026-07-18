/**
 * Fire-and-forget Discord webhook helpers.
 *
 * `sendDiscordNotification` never throws — callers can `await` it for delivery
 * confirmation or ignore the returned promise. `reportServerError` is used for
 * backend 5xx observability and MUST never receive PII or request bodies.
 */

const TIMEOUT_MS = 5000;

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordPayload {
  username?: string;
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    timestamp?: string;
    fields?: DiscordEmbedField[];
  }>;
}

export async function sendDiscordNotification(
  webhookUrl: string | undefined,
  payload: DiscordPayload,
): Promise<boolean> {
  if (!webhookUrl) {
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface ServerErrorContext {
  source: string;
  code?: string;
  message: string;
  status?: number;
  method?: string;
}

/**
 * Reports a backend error to the configured Discord error webhook.
 * No-op when DISCORD_ERROR_WEBHOOK_URL is unset (dev / test / CI).
 * Never includes request bodies, headers or any user-supplied PII.
 */
export function reportServerError(context: ServerErrorContext): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_ERROR_WEBHOOK_URL;
  if (!webhookUrl) {
    return Promise.resolve(false);
  }

  const fields: DiscordEmbedField[] = [
    { name: 'Source', value: context.source.slice(0, 256) || 'unknown', inline: true },
  ];
  if (context.method) {
    fields.push({ name: 'Method', value: context.method, inline: true });
  }
  if (typeof context.status === 'number') {
    fields.push({ name: 'Status', value: String(context.status), inline: true });
  }
  if (context.code) {
    fields.push({ name: 'Code', value: context.code, inline: true });
  }

  return sendDiscordNotification(webhookUrl, {
    username: 'Kiwibit Errors',
    embeds: [
      {
        title: '🚨 Backend error',
        description: context.message.slice(0, 1500),
        color: 0xef4444,
        fields,
      },
    ],
  });
}
