'use client';

import { useEffect, useState } from 'react';
import type {
  HomeMember,
  HomePost,
  HomeProject,
  PaginatedResponse,
  PublicListState,
} from './types';

function hasItemsArray<T>(value: unknown): value is PaginatedResponse<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const maybePaginated = value as { items?: unknown };
  return Array.isArray(maybePaginated.items);
}

/** Reads every page for the public catalog while keeping API pagination intact. */
export async function fetchPublicItems<T>(
  endpoint: string,
  signal: AbortSignal,
  allPages = false,
): Promise<T[]> {
  const [path, query] = endpoint.split('?');
  const params = new URLSearchParams(query);
  const items: T[] = [];
  let page = Number(params.get('page') ?? 1);
  while (!signal.aborted) {
    params.set('page', String(page));
    const response = await fetch(`${path}?${params}`, { signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    const payload: unknown = await response.json();
    if (!hasItemsArray<T>(payload)) throw new Error('Unexpected response format.');
    items.push(...payload.items);
    if (!allPages) return items;
    if (!Number.isSafeInteger(payload.total) || payload.total < 0)
      throw new Error('Unexpected pagination metadata.');
    if (items.length >= payload.total) return items;
    if (payload.items.length === 0)
      throw new Error('Project catalog ended before all projects were loaded.');
    page += 1;
  }
  throw new Error('Request aborted.');
}

function usePublicList<T>(endpoint: string, allPages = false): PublicListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchItems() {
      setIsLoading(true);
      setError(null);

      try {
        const nextItems = await fetchPublicItems<T>(endpoint, abortController.signal, allPages);
        if (!abortController.signal.aborted) setItems(nextItems);
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Unexpected error while loading data.';
        setError(message);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchItems();

    return () => {
      abortController.abort();
    };
  }, [endpoint, allPages]);

  return { items, isLoading, error };
}

export function useFeaturedProjects(limit = 6, featured = false): PublicListState<HomeProject> {
  return usePublicList<HomeProject>(
    `/api/projects?page=1&limit=${featured ? limit : 100}${featured ? '&featured=true' : ''}`,
    !featured,
  );
}

export function useHighlightedPosts(limit = 4): PublicListState<HomePost> {
  return usePublicList<HomePost>(`/api/posts?page=1&limit=${limit}`);
}

export function useHighlightedMembers(limit = 6): PublicListState<HomeMember> {
  return usePublicList<HomeMember>(`/api/members?page=1&limit=${limit}`);
}
