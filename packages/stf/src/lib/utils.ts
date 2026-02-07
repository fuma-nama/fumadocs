import { FieldKey } from './types';

/**
 * test if array a starts with array b, only compare values via `===`.
 */
export function arrayStartsWith(a: unknown[], b: unknown[]): boolean {
  if (b.length > a.length) return false;

  for (let i = 0; i < b.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

export function objectGet(obj: unknown, key: (string | number)[]): unknown | undefined {
  let cur = obj;

  for (const prop of key) {
    if (typeof cur !== 'object' || cur === null || !(prop in cur)) return;

    cur = cur[prop as keyof typeof cur];
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
  if (typeof parent !== 'object' || parent === null) throw new Error('missing parent object');
  (parent as Record<string, unknown>)[key[key.length - 1]] = value;
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

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

export function stringifyFieldKey(fieldKey: FieldKey) {
  return fieldKey.map((v) => `${typeof v}:${v}`).join('.');
}
