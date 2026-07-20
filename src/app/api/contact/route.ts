import { NextResponse } from 'next/server';
import { validateContact } from '@/features/contact/model/validate-contact';
import { apiError, parseJsonBody } from '@/shared/lib/api-helpers';
import { sendDiscordNotification } from '@/shared/lib/discord';
import { isRateLimited } from '@/shared/lib/rate-limit';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(request: Request) {
  const { body, error } = await parseJsonBody(request);
  if (error) {
    return error;
  }

  const source = (body ?? {}) as Record<string, unknown>;

  // Honeypot: bots fill hidden fields. Pretend success without doing anything.
  if (typeof source.website === 'string' && source.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const result = validateContact(body);
  if (!result.valid) {
    return apiError('VALIDATION_ERROR', 'Invalid contact submission.', 400);
  }

  if (isRateLimited(clientIp(request), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    return apiError('RATE_LIMITED', 'Too many requests. Please try again later.', 429);
  }

  const { name, email, company, message } = result.data;

  const delivered = await sendDiscordNotification(process.env.DISCORD_CONTACT_WEBHOOK_URL, {
    username: 'Kiwibit Site',
    embeds: [
      {
        title: '📬 New contact message',
        color: 0x4ade80,
        description: message.slice(0, 1000),
        fields: [
          { name: 'Name', value: name, inline: true },
          { name: 'Email', value: email, inline: true },
          { name: 'Company', value: company || '—', inline: true },
        ],
      },
    ],
  });

  if (!delivered) {
    return apiError('CONTACT_UNAVAILABLE', 'Could not deliver the message right now.', 503);
  }

  return NextResponse.json({ ok: true });
}
