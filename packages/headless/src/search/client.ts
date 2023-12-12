import { useEffect, useState } from 'react';
import useSWR, { type SWRResponse } from 'swr';
import type { SortedResult } from './shared';

interface UseDocsSearch<Result> {
  search: string;
  setSearch: (v: string) => void;
  query: SWRResponse<
    Result | 'empty',
    Error,
    {
      keepPreviousData: true;
    }
  >;
}

async function fetchDocs<Result>(
  api: string,
  query: string,
  locale: string | undefined,
  tag: string | undefined,
): Promise<Result | 'empty'> {
  if (query.length === 0) return 'empty';

  const params = new URLSearchParams();
  params.set('query', query);
  if (locale) params.set('locale', locale);
  if (tag) params.set('tag', tag);

  const res = await fetch(`${api}?${params.toString()}`);

  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Result;
}

export function useDocsSearch<Result = SortedResult[]>(
  locale?: string,
  tag?: string,
): UseDocsSearch<Result | 'empty'> {
  const [search, setSearch] = useState('');
  const debouncedValue = useDebounce(search, 100);

  const keys = ['/api/search', debouncedValue, locale, tag] as const;
  const searchQuery = useSWR<Result | 'empty', Error, typeof keys>(
    keys,
    (key) => fetchDocs<Result | 'empty'>(...key),
    {
      keepPreviousData: true,
    },
  );

  return { search, setSearch, query: searchQuery };
}

function useDebounce<T>(value: T, delayMs = 1000): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
