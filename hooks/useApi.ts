import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  setData: (data: T | null) => void;
  reset: () => void;
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await apiFunction(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err: any) {
        const errorMessage = err.message || 'An error occurred';
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        return null;
      }
    },
    [apiFunction]
  );

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    setData,
    reset,
  };
}

// Hook for paginated data
interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

interface UsePaginatedApiReturn<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  fetch: (params?: any) => Promise<void>;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
}

export function usePaginatedApi<T>(
  apiFunction: (params: any) => Promise<PaginatedData<T>>,
  initialParams: any = {}
): UsePaginatedApiReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState(initialParams);

  const fetch = useCallback(
    async (newParams?: any) => {
      const fetchParams = { ...params, ...newParams, page };
      if (newParams) {
        setParams((prev: any) => ({ ...prev, ...newParams }));
      }

      setLoading(true);
      setError(null);
      try {
        const result = await apiFunction(fetchParams);
        setItems(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, params, page]
  );

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const refresh = useCallback(async () => {
    await fetch();
  }, [fetch]);

  return {
    items,
    total,
    page,
    totalPages,
    loading,
    error,
    fetch,
    setPage,
    refresh,
  };
}

export default useApi;
