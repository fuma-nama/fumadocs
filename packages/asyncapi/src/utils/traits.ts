import type { MessageObject, OperationObject } from '@/types';
import { dereference } from '@fumadocs/json-schema';
import { isPlainObject } from 'shared-api/utils/is-plain-object';

/**
 * Merge traits into a target object: JSON Merge Patch in the order of traits, the target object wins.
 * @see https://github.com/asyncapi/spec/blob/v3.0.0/spec/asyncapi.md#traitsMergeMechanism
 */
export function mergeTraits<T extends object>(target: T, traits: object[]): T {
  let result: unknown = {};
  for (const trait of traits) result = mergePatch(result, trait);
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
    if (value[key] === null) delete result[key];
    else result[key] = key in result ? mergePatch(result[key], value[key], path) : value[key];
  }
  path.delete(value);

  return result;
}

export function applyOperationTraits(operation: OperationObject): OperationObject {
  if (!operation.traits || operation.traits.length === 0) return operation;
  return mergeTraits(operation, operation.traits);
}

export function applyMessageTraits(message: MessageObject): MessageObject {
  if (!message.traits || message.traits.length === 0) return message;
  return mergeTraits(message, message.traits);
}
