/**
 * Kept as a named re-export so the member form's import path stays stable while
 * the implementation lives in `shared/lib` — the API routes need it too, and
 * `shared` must not import from `features`.
 */
export { isHttpUrl as isValidAvatarUrl } from '@/shared/lib/url';
