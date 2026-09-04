import type { MemberFormValues } from './validate-member';

export type CreateMemberPayload = {
  name: string;
  bio?: string;
  bioPt?: string;
  bioEn?: string;
  avatarUrl?: string;
  avatarPath?: string;
  githubUrl?: string;
  linkedinUrl?: string;
};

export type UpdateMemberPayload = {
  name: string;
  bio: string | null;
  bioPt?: string | null;
  bioEn?: string | null;
  avatarUrl: string | null;
  avatarPath: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
};

/**
 * Create omits empty optionals.
 *
 * `POST /api/admin/members` builds its `data` with `typeof x === 'string'`
 * guards, so an omitted key simply is not written — which is what we want for a
 * brand-new row.
 */
export function toCreateMemberPayload(values: MemberFormValues): CreateMemberPayload {
  return {
    name: values.name.trim(),
    bio: values.bio.trim() || undefined,
    avatarUrl: values.avatarUrl.trim() || undefined,
    avatarPath: values.avatarPath.trim() || undefined,
    ...(values.bioPt !== undefined && { bioPt: values.bioPt.trim() || undefined }),
    ...(values.bioEn !== undefined && { bioEn: values.bioEn.trim() || undefined }),
    ...(values.githubUrl !== undefined && { githubUrl: values.githubUrl.trim() || undefined }),
    ...(values.linkedinUrl !== undefined && {
      linkedinUrl: values.linkedinUrl.trim() || undefined,
    }),
  };
}

/**
 * Update sends `null` to clear.
 *
 * `PUT /api/admin/members/[id]` distinguishes "absent" from "explicitly null"
 * via `!== undefined` checks: omitting a key leaves the column untouched, while
 * `null` clears it. Emptying the bio field must clear it, so it must be `null`
 * and never `undefined`.
 */
export function toUpdateMemberPayload(values: MemberFormValues): UpdateMemberPayload {
  return {
    name: values.name.trim(),
    bio: values.bio.trim() || null,
    avatarUrl: values.avatarUrl.trim() || null,
    avatarPath: values.avatarPath.trim() || null,
    ...(values.bioPt !== undefined && { bioPt: values.bioPt.trim() || null }),
    ...(values.bioEn !== undefined && { bioEn: values.bioEn.trim() || null }),
    ...(values.githubUrl !== undefined && { githubUrl: values.githubUrl.trim() || null }),
    ...(values.linkedinUrl !== undefined && {
      linkedinUrl: values.linkedinUrl.trim() || null,
    }),
  };
}
