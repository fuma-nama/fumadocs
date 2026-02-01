'use client';

import {
  use,
  createContext,
  type ReactNode,
  type DependencyList,
  useMemo,
  useEffect,
  useState,
  useRef,
} from 'react';
import type { ResolvedShikiConfig } from '../config';
import { CoreHighlightOptions, highlight } from '.';
import type { MakeOptional } from '@/types';

const ShikiConfigContext = createContext<ResolvedShikiConfig | null>(null);

export function useShikiConfigOptional() {
  return use(ShikiConfigContext);
}

export function useShikiConfig(forced?: ResolvedShikiConfig) {
  if (forced) return forced;
  const ctx = use(ShikiConfigContext);
  if (!ctx) throw new Error(`missing <ShikiConfigProvider />`);
  return ctx;
}

export function ShikiConfigProvider({
  config,
  children,
}: {
  config: ResolvedShikiConfig;
  children: ReactNode;
}) {
  return <ShikiConfigContext value={config}>{children}</ShikiConfigContext>;
}

const promises: Record<string, Promise<ReactNode>> = {};

export type UseShikiOptions = MakeOptional<CoreHighlightOptions, 'config'>;

/**
 * get highlighted results (uncached), use `useEffect` instead of React 19 APIs.
 */
export function useShikiDynamic(
  code: string,
  options: UseShikiOptions & { defaultValue?: ReactNode },
  deps: DependencyList,
): ReactNode {
  const [node, setNode] = useState(options.defaultValue);
  const config = useShikiConfig(options.config);
  const lastTask = useRef<Promise<ReactNode> | null>(null);

  useEffect(() => {
    const promise = highlight(code, {
      ...options,
      config,
    });
    lastTask.current = promise;

    void promise.then((res) => {
      if (lastTask.current === promise) setNode(res);
    });
    return () => {
      lastTask.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return node;
}

/**
 * get highlighted results, should be used with React Suspense API.
 *
 * note: results are cached with (lang, code) as keys, if this is not the desired behaviour, pass a `deps` instead.
 */
export function useShiki(code: string, options: UseShikiOptions, deps?: DependencyList): ReactNode {
  const config = useShikiConfig(options.config);
  const key = useMemo(() => {
    return deps ? JSON.stringify(deps) : `${options.lang}:${code}`;
  }, [code, deps, options.lang]);

  return use(
    (promises[key] ??= highlight(code, {
      ...options,
      config,
    })),
  );
}
