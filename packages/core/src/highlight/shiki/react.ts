'use client';

import {
  use,
  type ReactNode,
  type DependencyList,
  useMemo,
  useEffect,
  useState,
  useRef,
} from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import type { Awaitable } from '@/types';
import { toJsxRuntime, type Components } from 'hast-util-to-jsx-runtime';
import type { HighlighterCore } from 'shiki';
import { highlightHast, type HighlightHastOptions } from '.';

const promises: Record<string, Promise<ReactNode>> = {};

export type UseShikiOptions = HighlightHastOptions & {
  components?: Partial<Components>;
};

/**
 * get highlighted results (uncached), use `useEffect` instead of React 19 APIs.
 */
export function useShikiDynamic(
  highlighter: HighlighterCore | (() => Awaitable<HighlighterCore>),
  code: string,
  options: UseShikiOptions & { defaultValue?: ReactNode },
  deps: DependencyList,
): ReactNode {
  const [node, setNode] = useState(options.defaultValue);
  const lastTask = useRef<Promise<ReactNode> | null>(null);

  useEffect(() => {
    async function task() {
      const instance = typeof highlighter === 'function' ? await highlighter() : highlighter;

      return toJsxRuntime(await highlightHast(instance, code, options), {
        ...JsxRuntime,
        components: options.components,
      });
    }

    const promise = task();
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
export function useShiki(
  highlighter: HighlighterCore | (() => Awaitable<HighlighterCore>),
  code: string,
  options: UseShikiOptions,
  deps: DependencyList = [options.lang, code],
): ReactNode {
  const key = useMemo(() => JSON.stringify(deps), [deps]);

  async function run() {
    const instance = typeof highlighter === 'function' ? await highlighter() : highlighter;

    return toJsxRuntime(await highlightHast(instance, code, options), {
      ...JsxRuntime,
      components: options.components,
    });
  }

  return use((promises[key] ??= run()));
}
