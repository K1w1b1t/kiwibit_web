import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { runAfterResponse } from '@/shared/lib/after-response';
import { authOptions } from '@/shared/lib/auth';
import { reportServerError } from '@/shared/lib/discord';
import { ADMIN_ROLES } from '@/shared/lib/roles';

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      ),
    };
  }
  if (!ADMIN_ROLES.has(session.user.role)) {
    return {
      session: null,
      response: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions.' } },
        { status: 403 },
      ),
    };
  }
  return { session, response: null };
}

export function apiError(code: string, message: string, status: number) {
  if (status >= 500) {
    // Reported after the response so the webhook is not killed mid-flight when
    // the serverless instance is frozen, and without delaying the response.
    runAfterResponse(() => reportServerError({ source: 'apiError', code, message, status }));
  }
  return NextResponse.json({ error: { code, message } }, { status });
}

/** The error a validator wants the route to return, in `apiError` terms. */
export type ApiFailure = { code: string; message: string; status: number };

/**
 * Outcome of a request-body validator: either the parsed input or the failure to
 * hand back. Route handlers keep a single branch per validator call instead of
 * one per field, which is what kept the admin handlers over the complexity
 * budget.
 */
export type Validated<T> = { data: T; failure: null } | { data: null; failure: ApiFailure };

export function valid<T>(data: T): Validated<T> {
  return { data, failure: null };
}

export function failure(code: string, message: string, status: number): ApiFailure {
  return { code, message, status };
}

export function invalid<T>(code: string, message: string, status: number): Validated<T> {
  return { data: null, failure: failure(code, message, status) };
}

/** Lifts a bare failure from a field-checking pass into a validator result. */
export function rejected<T>(problem: ApiFailure): Validated<T> {
  return { data: null, failure: problem };
}

export function failureResponse({ code, message, status }: ApiFailure) {
  return apiError(code, message, status);
}

/** Rejects non-strings and whitespace-only strings alike. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

export function parsePaginationParams(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));
  const search = searchParams.get('search') ?? undefined;
  return { page, limit, search, searchParams };
}

export async function parseJsonBody(
  request: Request,
): Promise<{ body: unknown; error: null } | { body: null; error: ReturnType<typeof apiError> }> {
  try {
    const body: unknown = await request.json();
    return { body, error: null };
  } catch {
    return { body: null, error: apiError('BAD_REQUEST', 'Invalid JSON body.', 400) };
  }
}

export function paginatedJson(items: unknown[], page: number, limit: number, total: number) {
  return NextResponse.json({ items, page, limit, total });
}

/** Minimal structural interface for Prisma model delegates used in paginated queries. */
export interface PaginatableDelegate {
  findMany(args: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
    orderBy?: OrderBy;
    select?: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<Record<string, unknown>[]>;
  count(args?: { where?: Record<string, unknown> }): Promise<number>;
}

/** A single sort or a list of sorts, as Prisma accepts. */
export type OrderBy = Record<string, unknown> | Record<string, unknown>[];

export async function runPaginatedQuery(
  model: PaginatableDelegate,
  where: Record<string, unknown>,
  page: number,
  limit: number,
  extra?: {
    select?: Record<string, unknown>;
    /** Relations to load — the helper used to support `select` only. */
    include?: Record<string, unknown>;
    /** Overrides the default `createdAt desc` (e.g. `publishedAt desc`). */
    orderBy?: OrderBy;
  },
) {
  const [items, total] = await Promise.all([
    model.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: extra?.orderBy ?? { createdAt: 'desc' },
      ...(extra?.select && { select: extra.select }),
      ...(extra?.include && { include: extra.include }),
    }),
    model.count({ where }),
  ]);
  return paginatedJson(items, page, limit, total);
}
