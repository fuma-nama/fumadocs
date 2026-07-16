import type { NoReferenceSwallow as NoReferenceShallow } from '.';
import { isPlainObject } from '../utils/is-plain-object';

const cacheMap = new WeakMap<object, unknown>();

/**
 * Resolve the `$ref` of a Reference Object (shallowly), merging sibling keywords into the target (sibling keywords take precedence).
 *
 * The input must be a node of a magic proxy (`@scalar/json-magic`), Reference Objects are resolved
 * with the virtual `$ref-value` property of the proxy.
 *
 * Returns non-reference values as-is.
 */
export function dereferenceShallow<T>(schema: T): NoReferenceShallow<T> {
  if (!isPlainObject(schema) || typeof schema.$ref !== 'string') return schema as never;
  const cached = cacheMap.get(schema);
  if (cached) return cached as never;

  // `$ref-value` is a virtual property added by the magic proxy, exclude it from sibling keywords
  const { $ref: _, '$ref-value': refValue, ...rest } = schema as Record<string, unknown>;
  const resolved = dereferenceShallow(refValue);
  let result: unknown = rest;

  if (isPlainObject(resolved)) {
    if (Object.keys(rest).length === 0) result = resolved;
    else result = { ...resolved, ...rest };
  }
  cacheMap.set(schema, result);
  return result as never;
}
