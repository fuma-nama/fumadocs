'use client';
import {
  type DependencyList,
  type ReactNode,
  use,
  useId,
  useMemo,
} from 'react';
import { highlight, type HighlightOptions } from './shiki';

const promises: Record<string, Promise<ReactNode>> = {};

export function useShiki(
  code: string,
  options: HighlightOptions & {
    /**
     * @deprecated no longer pre-rendered using scripts.
     */
    withPrerenderScript?: boolean;

    /**
     * Displayed before highlighter is loaded.
     *
     * @deprecated use React `Suspense` fallback instead.
     */
    loading?: ReactNode;
  },
  deps?: DependencyList,
): ReactNode {
  const id = useId();
  const key = useMemo(() => {
    const state = deps ? JSON.stringify(deps) : `${options.lang}:${code}`;

    return `${id}:${state}`;
  }, [code, deps, id, options.lang]);

  return use(
    (promises[key] ??= highlight(code, {
      ...options,
      engine: options.engine ?? 'js',
    })),
  );
}
