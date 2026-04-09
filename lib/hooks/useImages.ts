import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { images, type ImageFilters } from "../api";
import type { ImageItem } from "../types";
import { useAuth } from "./useAuth";

export function useImageList(filters?: ImageFilters) {
  const { baseUrl, token } = useAuth();
  const [data, setData] = useState<ImageItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasFetched = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await images.list(baseUrl, token, filters);
      setData(result.items);
      setTotalCount(result.meta.total_count);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, JSON.stringify(filters)]);

  const silentRefresh = useCallback(async () => {
    try {
      const result = await images.list(baseUrl, token, filters);
      setData(result.items);
      setTotalCount(result.meta.total_count);
    } catch {
      // silent
    }
  }, [baseUrl, token, JSON.stringify(filters)]);

  useEffect(() => {
    refresh();
    hasFetched.current = true;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (hasFetched.current) {
        silentRefresh();
      }
    }, [silentRefresh])
  );

  return { images: data, totalCount, loading, error, refresh };
}

export function useImageDetail(id: number) {
  const { baseUrl, token } = useAuth();
  const [image, setImage] = useState<ImageItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await images.get(baseUrl, token, id);
      setImage(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { image, loading, error, refresh };
}
