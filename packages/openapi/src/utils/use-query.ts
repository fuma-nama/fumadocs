import { useMemo, useState } from 'react';

export function useQuery<I, T>(
  fn: (input: I) => Promise<T>,
): {
  start: (input: I) => void;
  data?: T;
  isLoading: boolean;
} {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T>();

  return useMemo(
    () => ({
      isLoading: loading,
      data,
      start(input) {
        setLoading(true);

        void fn(input)
          .then((res) => {
            setData(res);
          })
          .catch(() => {
            setData(undefined);
          })
          .finally(() => {
            setLoading(false);
          });
      },
    }),
    [data, fn, loading],
  );
}
