import { hash } from './hash';
import { cache } from 'react';

export interface RevalidableConfig<Args extends unknown[], O> {
  staleTime?: number;
  create: (...args: Args) => O;
  cacheKey?: (...args: Args) => string;
}

export type WithRevalidate<Args extends unknown[], O> = {
  revalidate: (keepStale?: boolean) => void;
  (...args: Args): O;
};

export function revalidable<Args extends unknown[], O>(
  config: RevalidableConfig<Args, O>,
): WithRevalidate<Args, O> {
  const { create, staleTime, cacheKey = (...args) => hash(args) } = config;

  const cacheMap = new Map<
    string,
    {
      lastValidated: number;
      lastResult: O;
      revalidating: boolean;
    }
  >();
  const out = cache((...args: Args) => {
    const key = cacheKey(...args);
    const cache = cacheMap.get(key);

    if (!cache) {
      const lastResult = create(...args);
      // init
      cacheMap.set(key, {
        lastResult,
        lastValidated: Date.now(),
        revalidating: false,
      });
      return lastResult;
    }

    const isStale = staleTime !== undefined && Date.now() - cache.lastValidated >= staleTime;
    if (!isStale || cache.revalidating) return cache.lastResult;

    const next = create(...args);

    if (next instanceof Promise) {
      cache.revalidating = true;
      void next
        .then((res) => {
          cache.lastResult = res;
          cache.lastValidated = Date.now();
        })
        .finally(() => {
          cache.revalidating = false;
        });
    } else {
      cache.lastResult = next;
      cache.lastValidated = Date.now();
    }

    return cache.lastResult;
  }) as WithRevalidate<Args, O>;

  out.revalidate = function revalidate(keepStale = true) {
    if (keepStale) {
      for (const value of cacheMap.values()) {
        value.lastValidated = 0;
      }
    } else {
      cacheMap.clear();
    }
  };

  return out;
}
