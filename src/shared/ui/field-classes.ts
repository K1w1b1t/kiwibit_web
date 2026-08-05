/** Class recipes and a11y wiring shared by every admin form control. */
export const FIELD_LABEL_CLASS = 'mb-1 block text-xs uppercase tracking-[0.18em] text-white/50';

export const FIELD_CONTROL_CLASS =
  'input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 transition-colors duration-200 focus:border-white/25 focus:outline-none disabled:opacity-50';

export const FIELD_ERROR_CLASS = 'mt-1 text-xs text-amber-300';

export const FIELD_HINT_CLASS = 'mt-1 text-xs text-white/35';

/**
 * Resolves the `aria-describedby` target for a form control. The error message
 * wins over the hint because the control only renders one of the two, and the
 * error is the more urgent of the pair.
 */
export function fieldDescribedBy(
  id: string,
  error: string | undefined,
  hint: string | undefined,
): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
