'use client';
import { type DependencyList, type ReactNode, use, useMemo } from 'react';
import { highlight, type HighlightOptions } from './shiki';

const promises: Record<string, Promise<ReactNode>> = {};

/**
 * get highlighted results, should be used with React Suspense API.
 *
 * note: results are cached with (lang, code) as keys, if this is not the desired behaviour, pass a `deps` instead.
 */
export function useShiki(
  code: string,
  options: HighlightOptions,
  deps?: DependencyList,
): ReactNode {
  const key = useMemo(() => {
    return deps ? JSON.stringify(deps) : `${options.lang}:${code}`;
  }, [code, deps, options.lang]);

  return use((promises[key] ??= highlight(code, options)));
}
