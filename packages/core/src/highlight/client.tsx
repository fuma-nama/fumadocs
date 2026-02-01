'use client';
import type { DependencyList, ReactNode } from 'react';
import { configDefault, type HighlightOptions } from '.';
import { useShiki as useShikiBase } from './core/client';

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
  return useShikiBase(
    code,
    {
      config: configDefault,
      ...options,
    },
    deps,
  );
}
