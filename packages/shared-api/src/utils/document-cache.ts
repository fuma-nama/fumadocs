/**
 * Load documents by ID for pages rendered without one, read the result with `use()`.
 *
 * The browser keeps them for the session, so pages of a document share one load.
 * Server rendering calls `load()` on every render, servers cache documents themselves.
 */
export function createDocumentCache<T>(): (
  id: string,
  load: (id: string) => Promise<T>,
) => Promise<T> {
  const cache = new Map<string, Promise<T>>();

  return (id, load) => {
    if (typeof window === 'undefined') return load(id);

    let promise = cache.get(id);
    if (!promise) {
      promise = load(id);
      // retry on the next render
      promise.catch(() => cache.delete(id));
      cache.set(id, promise);
    }
    return promise;
  };
}
