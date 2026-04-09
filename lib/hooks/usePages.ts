import { useCallback, useEffect, useState } from "react";

import { pages, type PageFilters } from "../api";
import type { PageDetail, PageListItem } from "../types";
import { useAuth } from "./useAuth";

export function usePageChildren(parentId: number) {
  const { baseUrl, token } = useAuth();
  const [data, setData] = useState<PageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pages.list(baseUrl, token, {
        parent: parentId,
        limit: 50,
      });
      setData(result.items);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, parentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { pages: data, loading, error, refresh };
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
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pages.list(baseUrl, token, filters);
      setData(result.items);
      setTotalCount(result.meta.total_count);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, JSON.stringify(filters)]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { pages: data, totalCount, loading, error, refresh };
}
