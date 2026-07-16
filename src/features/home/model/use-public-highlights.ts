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

function usePublicList<T>(endpoint: string): PublicListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchItems() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(endpoint, {
          signal: abortController.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload: unknown = await response.json();
        if (!hasItemsArray<T>(payload)) {
          throw new Error('Unexpected response format.');
        }

        setItems(payload.items);
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
  }, [endpoint]);

  return { items, isLoading, error };
}

export function useFeaturedProjects(limit = 6): PublicListState<HomeProject> {
  return usePublicList<HomeProject>(`/api/projects?page=1&limit=${limit}`);
}

export function useHighlightedPosts(limit = 4): PublicListState<HomePost> {
  return usePublicList<HomePost>(`/api/posts?page=1&limit=${limit}`);
}

export function useHighlightedMembers(limit = 6): PublicListState<HomeMember> {
  return usePublicList<HomeMember>(`/api/members?page=1&limit=${limit}`);
}
