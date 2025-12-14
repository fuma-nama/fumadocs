export class AsyncCache<V> {
  readonly store = new Map<string, V | Promise<V>>();

  cached(key: string, fn: () => V | Promise<V>): V | Promise<V> {
    let cached = this.store.get(key);
    if (cached !== undefined) return cached;

    cached = fn();
    this.store.set(key, cached);
    return cached;
  }
}
