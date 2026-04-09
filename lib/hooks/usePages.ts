import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { pages, type PageFilters } from "../api";
import type { PageDetail, PageListItem } from "../types";
import { useAuth } from "./useAuth";

const PAGE_SIZE = 20;

export function usePageChildren(parentId: number) {
  const { baseUrl, token } = useAuth();
  const [data, setData] = useState<PageListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasFetched = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pages.list(baseUrl, token, {
        parent: parentId,
        limit: PAGE_SIZE,
      });
      setData(result.items);
      setTotalCount(result.meta.total_count);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, parentId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || data.length >= totalCount) return;
    setLoadingMore(true);
    try {
      const result = await pages.list(baseUrl, token, {
        parent: parentId,
        limit: PAGE_SIZE,
        offset: data.length,
      });
      setData((prev) => [...prev, ...result.items]);
    } catch {
      // silent — keep existing data
    } finally {
      setLoadingMore(false);
    }
  }, [baseUrl, token, parentId, data.length, totalCount, loadingMore]);

  // Silent refresh: updates first page without toggling loading state
  const silentRefresh = useCallback(async () => {
    try {
      const result = await pages.list(baseUrl, token, {
        parent: parentId,
        limit: PAGE_SIZE,
      });
      setData(result.items);
      setTotalCount(result.meta.total_count);
    } catch {
      // silent — don't overwrite existing error state
    }
  }, [baseUrl, token, parentId]);

  useEffect(() => {
    refresh();
    hasFetched.current = true;
  }, [refresh]);

  // Re-fetch silently when screen regains focus (e.g. after create/edit/delete)
  useFocusEffect(
    useCallback(() => {
      if (hasFetched.current) {
        silentRefresh();
      }
    }, [silentRefresh])
  );

  const hasMore = data.length < totalCount;

  return { pages: data, loading, loadingMore, hasMore, error, refresh, loadMore };
}

export function usePageDetail(id: number, richTextFormat?: string) {
  const { baseUrl, token } = useAuth();
  const [page, setPage] = useState<PageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pages.get(baseUrl, token, id, richTextFormat);
      setPage(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { page, loading, error, refresh };
}

export function usePageSearch(filters: PageFilters) {
  const { baseUrl, token } = useAuth();
  const [data, setData] = useState<PageListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pages.list(baseUrl, token, {
        ...filters,
        limit: filters.limit || PAGE_SIZE,
      });
      setData(result.items);
      setTotalCount(result.meta.total_count);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, JSON.stringify(filters)]);

  const loadMore = useCallback(async () => {
    if (loadingMore || data.length >= totalCount) return;
    setLoadingMore(true);
    try {
      const result = await pages.list(baseUrl, token, {
        ...filters,
        limit: filters.limit || PAGE_SIZE,
        offset: data.length,
      });
      setData((prev) => [...prev, ...result.items]);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [baseUrl, token, JSON.stringify(filters), data.length, totalCount, loadingMore]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasMore = data.length < totalCount;

  return { pages: data, totalCount, loading, loadingMore, hasMore, error, refresh, loadMore };
}
