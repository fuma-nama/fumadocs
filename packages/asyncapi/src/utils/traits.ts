import { dereference } from '@fumadocs/json-schema';
import { isPlainObject } from 'shared-api/utils/is-plain-object';

/**
 * Merge the traits of an operation or message: JSON Merge Patch in the order of traits, the object itself wins.
 * @see https://github.com/asyncapi/spec/blob/v3.0.0/spec/asyncapi.md#traitsMergeMechanism
 */
export function applyTraits<T extends { traits?: object[] }>(target: T): T {
  if (!target.traits || target.traits.length === 0) return target;
  let result: unknown = {};
  for (const trait of target.traits) result = mergePatch(result, trait);
  const { traits: _applied, ...merged } = mergePatch(result, target) as Record<string, unknown>;

  return merged as T;
}

/** `path`: the patches being merged, recursive schemas stop at them */
function mergePatch(target: unknown, patch: unknown, path = new Set<unknown>()): unknown {
  // Reference Objects are merged as the objects they point to
  const value = dereference(patch);
  const base = dereference(target);
  if (!isPlainObject(value) || !isPlainObject(base) || base === value || path.has(value))
    return value;

  const result: Record<string, unknown> = { ...base };
  path.add(value);
  for (const key in value) {
    const item = value[key];
    if (item === null) delete result[key];
    else result[key] = key in result ? mergePatch(result[key], item, path) : item;
  }
  path.delete(value);

  return result;
}
