import { useState, useCallback } from "react";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export function useAsync<T, Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
  immediate = false
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(
    async (...args: Args) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await asyncFn(...args);
        setState({ data, error: null, isLoading: false });
        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : "An error occurred";
        setState({ data: null, error, isLoading: false });
        throw err;
      }
    },
    [asyncFn]
  );

  return { ...state, execute };
}
