import { deserialize, serialize } from "@/utils/serialization";

type Awaitable<T> = T | Promise<T>;

/**
 * cache utf-8 serialized value (e.g. JSON)
 */
export interface Cache {
  read: (key: string) => Awaitable<string | undefined>;
  write: (key: string, value: string) => Awaitable<void>;
}

/**
 * Note: the returned value is always re-constructed, direct modifications will not pollute the cached values.
 */
export async function cached<V>(
  cache: Cache | false,
  key: string,
  op: () => V | Promise<V>,
): Promise<V> {
  if (cache === false) return op();
  const cached = await cache.read(key);
  if (cached) return deserialize(cached) as V;

  const out = await op();
  await cache.write(key, serialize(out));
  return out;
}
