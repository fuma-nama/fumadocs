import { LRUCache } from 'lru-cache';

const map = new LRUCache<string, string | object>({
  max: 200,
});

export const fileCache = {
  read<Data>(namespace: string, path: string) {
    return map.get(`${namespace}.${path}`) as Data;
  },
  write(namespace: string, path: string, data: unknown) {
    map.set(`${namespace}.${path}`, data as object);
  },
  removeCache(path: string) {
    for (const key of map.keys()) {
      const keyPath = key.slice(key.indexOf('.') + 1);

      if (keyPath === path) map.delete(key);
    }
  },
};
