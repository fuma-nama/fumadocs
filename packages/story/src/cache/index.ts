import { parse, stringify } from '@ungap/structured-clone/json';
/**
 * cache utf-8 serialized value (e.g. JSON)
 */
export interface Cache {
  read: (key: string) => string | undefined | Promise<string | undefined>;
  write: (key: string, value: string) => void | Promise<void>;
}

export * from './fs';

export async function cached<V>(
  cache: Cache | false,
  key: string,
  op: () => V | Promise<V>,
): Promise<V> {
  if (cache === false) return op();
  const cached = await cache.read(key);
  if (cached) return deserializeCache(cached) as V;

  const out = await op();
  await cache.write(key, serializeCache(out));
  return out;
}

export function serializeCache(value: unknown): string {
  return stringify(value);
}

export function deserializeCache(value: string): unknown {
  return parse(value);
}
