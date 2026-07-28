/**
 * Joins class names, dropping falsy entries.
 *
 * Deliberately not a Tailwind class *merger* (no clsx/tailwind-merge): the
 * project has no such dependency, and every component here composes classes
 * rather than overriding them.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
