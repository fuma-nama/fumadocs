'use client';
import type { DependencyList, ReactNode } from 'react';
import type { HighlightOptions } from '.';
import { useShiki as useShikiBase } from './shiki/react';
import { defaultShikiFactory } from './shiki/full';
import { applyDefaultThemes } from './utils';

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
    () => defaultShikiFactory.getOrInit(),
    code,
    applyDefaultThemes(options),
    deps,
  );
}
