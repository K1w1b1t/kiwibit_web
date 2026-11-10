import { z } from 'zod';

export const preparePostImageSchema = z
  .object({
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    bytesBase64: z
      .string()
      .min(1)
      .max(4 * 1024 * 1024),
  })
  .strict();

export const createPostDraftSchema = z
  .object({
    titlePt: z.string().min(3).max(200).optional(),
    titleEn: z.string().min(3).max(200).optional(),
    contentPt: z.string().min(10).max(100000).optional(),
    contentEn: z.string().min(10).max(100000).optional(),
    contentFormat: z.enum(['text', 'html', 'markdown']),
    coverImageRef: z.uuid().optional(),
    imageRefs: z.array(z.uuid()).max(30).default([]),
    coverImageAltPt: z.string().max(300).optional(),
    coverImageAltEn: z.string().max(300).optional(),
    idempotencyKey: z
      .string()
      .min(8)
      .max(128)
      .regex(/^[a-zA-Z0-9_-]+$/),
  })
  .strict();

export type McpPrincipal = { userId: string; connectionId: string; scopes: string[] };
export class McpToolError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
