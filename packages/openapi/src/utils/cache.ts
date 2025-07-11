import { LRUCache } from 'lru-cache';

export function cache<T extends (...args: any[]) => any>(fn: T): T {
  const memo = new LRUCache<string, string | object>({
    max: 200,
  });
  return function (...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    if (memo.has(key)) {
      return memo.get(key) as ReturnType<T>;
    }
    const result = fn(...args);
    memo.set(key, result);
    return result;
  } as T;
}
