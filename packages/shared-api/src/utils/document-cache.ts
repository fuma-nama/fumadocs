/** Browsers load each document once per session, servers cache documents themselves. */
export function createDocumentCache<T>() {
  const cache = new Map<string, Promise<T>>();

  return (id: string, load: (id: string) => Promise<T>): Promise<T> => {
    if (typeof window === 'undefined') return load(id);

    let promise = cache.get(id);
    if (!promise) {
      cache.set(id, (promise = load(id)));
      // retry on the next render
      promise.catch(() => cache.delete(id));
    }
    return promise;
  };
}
