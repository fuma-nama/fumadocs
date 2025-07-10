export function cache<T extends (...args: any[]) => any>(fn: T): T {
  const memo = new Map<string, ReturnType<T>>();
  return function (...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    if (memo.has(key)) {
      return memo.get(key)!;
    }
    const result = fn(...args);
    memo.set(key, result);
    return result;
  } as T;
}
