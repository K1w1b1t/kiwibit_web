export type LinkedInReviewComposition =
  | { valid: true; text: string; hashtags: string; companyLength: number }
  | { valid: false; error: string };

/** Compose exactly the text reviewed by the publisher, without truncating it. */
export function composeLinkedInReview(text: string, hashtags: string): LinkedInReviewComposition {
  const body = text.trim();
  if (!body) return { valid: false, error: 'Informe o texto da publicação.' };

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const raw of hashtags.trim().split(/\s+/).filter(Boolean)) {
    const tag = raw.replace(/^#/, '');
    if (!/^[\p{L}\p{N}_]+$/u.test(tag)) {
      return { valid: false, error: 'Use apenas letras, números e sublinhado nas hashtags.' };
    }
    const key = tag.toLocaleLowerCase('pt-BR');
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(`#${tag}`);
    }
  }

  const formattedTags = normalized.join(' ');
  const finalText = [body, formattedTags].filter(Boolean).join('\n\n');
  if (finalText.length > 3000) {
    return {
      valid: false,
      error: 'O texto final excede o limite do perfil pessoal (3.000 caracteres).',
    };
  }
  const companyLength = escapeLinkedInCommentary(finalText).length;
  if (companyLength > 1500) {
    return {
      valid: false,
      error: 'O texto final excede o limite da página da empresa (1.500 caracteres).',
    };
  }
  return { valid: true, text: finalText, hashtags: formattedTags, companyLength };
}
import { escapeLinkedInCommentary } from '@/shared/lib/linkedin-commentary';
