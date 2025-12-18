export class AsyncCache<V> {
  readonly store = new Map<string, V | Promise<V>>();

  cached<V1 extends V = V>(
    key: string,
    fn: () => V1 | Promise<V1>,
  ): V1 | Promise<V1> {
    let cached = this.store.get(key);
    if (cached !== undefined) return cached as V1;

    cached = fn();
    this.store.set(key, cached);
    return cached as V1;
  }
}
