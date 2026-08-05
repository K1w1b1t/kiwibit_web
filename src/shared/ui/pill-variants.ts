/**
 * Single source of truth for the pill look shared by `PillLink` (marketing) and
 * `Button` (admin). Kept as plain strings because Tailwind cannot generate
 * classes from runtime values.
 */
export type PillVariant = 'solid' | 'outline' | 'accent' | 'danger';

export const PILL_VARIANT_CLASSES: Record<PillVariant, string> = {
  solid: 'bg-white text-black hover:bg-white/85',
  outline: 'border border-white/35 text-white hover:border-white/80',
  accent: 'bg-accent text-black hover:bg-accent/85',
  danger: 'border border-red-400/40 text-red-100 hover:border-red-400/80 hover:bg-red-500/10',
};

export const PILL_BASE =
  'inline-flex items-center justify-center rounded-full font-semibold uppercase transition disabled:cursor-not-allowed disabled:opacity-50';

export type PillSize = 'sm' | 'md';

export const PILL_SIZE_CLASSES: Record<PillSize, string> = {
  sm: 'px-5 py-2.5 text-xs tracking-[0.12em]',
  md: 'px-8 py-3 text-sm tracking-[0.12em]',
};
