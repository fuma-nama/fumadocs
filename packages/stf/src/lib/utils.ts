import type { FieldKey } from './types';

export function objectGet(obj: unknown, key: (string | number)[]): unknown | undefined {
  let cur = obj;

  for (const prop of key) {
    if (!isPlainObject(cur) || !(prop in cur)) return;
    cur = cur[prop];
  }

  return cur;
}

/**
 * set the value of field if it exists (in place)
 *
 * @returns updated value, throw error if parent object doesn't exist
 */
export function objectSet(obj: unknown, key: FieldKey, value: unknown): unknown {
  if (key.length === 0) {
    return value;
  }

  const parent = objectGet(obj, key.slice(0, -1));
  if (!isPlainObject(parent)) throw new Error('missing parent object');
  parent[key[key.length - 1]] = value;
  return obj;
}

/**
 * doesn't handle recursive objects
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return false;
  }

  if (typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }

  if (!isPlainObject(a) || !isPlainObject(b)) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every((key) => key in b && deepEqual(a[key], b[key]));
}

export function stringifyFieldKey(fieldKey: FieldKey) {
  return fieldKey.map((v) => (typeof v === 'string' ? `_${v}` : `n${v}`)).join('.');
}

/**
 * @returns if `a` starts with `b`.
 */
export function fieldKeyStartsWith(a: string, b: string): boolean {
  return b.length === 0 || a === b || a.startsWith(b + '.');
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return (
    prototype === null ||
    prototype === Object.prototype ||
    Object.getPrototypeOf(prototype) === null
  );
}
