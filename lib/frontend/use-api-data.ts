"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/frontend/api-client";

interface UseApiDataState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads data from a function returning a Promise. Re-runs whenever the
 * dependency array changes (e.g. the active organization id) or on reload().
 */
export function useApiData<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList
): UseApiDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    loaderRef.current()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err : new ApiError("UNKNOWN", "Something went wrong", 0));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, reload };
}
