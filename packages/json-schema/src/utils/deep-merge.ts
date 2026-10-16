import { isPlainObject } from './is-plain-object';

/** set an own property, assigning to `__proto__` would change the prototype */
export function setOwn(obj: object, key: string, value: unknown) {
  Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
}

/**
 * deep merge plain objects into a new object, other values (including arrays) are replaced.
 */
export function mergeDeep<T extends object>(target: T, ...sources: unknown[]): T {
  let out = merge(undefined, target);
  for (const source of sources) out = merge(out, source);
  return out as T;
}

function merge(target: unknown, source: unknown): unknown {
  if (!isPlainObject(source)) return source;
  const out: Record<string, unknown> = {};

  if (isPlainObject(target)) {
    for (const key of Object.keys(target)) {
      if (!Object.hasOwn(source, key)) setOwn(out, key, merge(undefined, target[key]));
    }
  }

  for (const key of Object.keys(source)) {
    const prev = isPlainObject(target) && Object.hasOwn(target, key) ? target[key] : undefined;
    setOwn(out, key, merge(prev, source[key]));
  }
  return out;
}
