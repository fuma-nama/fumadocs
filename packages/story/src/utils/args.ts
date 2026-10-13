import { isValidElement } from 'react';
import { isPlainObject } from '@fumari/stf/lib/utils';

/** objects of arguments, other values like elements are kept as-is */
function isArgsObject(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && !isValidElement(value);
}

/** copy the objects and arrays of arguments, the form engine edits them in place */
export function cloneArgs<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneArgs(item)) as T;
  if (!isArgsObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const key in value) out[key] = cloneArgs(value[key]);
  return out as T;
}

/** merge the objects of `source` into `target`, other values of `source` replace them */
export function mergeArgs(target: unknown, source: unknown): unknown {
  if (!isArgsObject(target) || !isArgsObject(source)) return source;

  const out = { ...target };
  for (const key in source) out[key] = mergeArgs(target[key], source[key]);
  return out;
}
