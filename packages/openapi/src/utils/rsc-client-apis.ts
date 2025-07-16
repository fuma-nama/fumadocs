import { LRUCache } from 'lru-cache';
import { Suspense, cache as reactCache } from 'react';

export const cache: typeof reactCache = function cache(fn) {
  const memo = new LRUCache<string, string | object>({
    max: 200,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (...args: any[]) {
    const key = JSON.stringify(args);
    if (memo.has(key)) {
      return memo.get(key);
    }
    const result = fn(...args);
    memo.set(key, result);
    return result;
  };
} as typeof reactCache;

export { Suspense as ClientSuspense };
