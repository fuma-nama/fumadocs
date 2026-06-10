import type { MessageObject, OperationObject } from '@/types';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { isPlainObject } from './is-plain-object';

/**
 * Merge traits into a target object per the AsyncAPI traits merge mechanism.
 * @see https://github.com/asyncapi/spec/blob/v3.0.0/spec/asyncapi.md#traitsMergeMechanism
 */
export function mergeTraits<T extends Record<string, unknown>>(
  target: T,
  traits: Record<string, unknown>[],
): T {
  let result: Record<string, unknown> = { ...target };
  for (const trait of traits) {
    result = mergeTraitLayer(result, trait);
  }
  return result as T;
}

function mergeTraitLayer(
  target: Record<string, unknown>,
  trait: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const [key, traitValue] of Object.entries(trait)) {
    if (key === 'traits') continue;

    const targetValue = result[key];
    if (targetValue === undefined) {
      result[key] = traitValue;
    } else if (isPlainObject(targetValue) && isPlainObject(traitValue)) {
      result[key] = mergeTraitLayer(targetValue, traitValue);
    }
  }

  return result;
}

export function applyOperationTraits(
  operation: NoReference<OperationObject>,
): NoReference<OperationObject> {
  const traits = operation.traits;
  if (!traits || traits.length === 0) return operation;

  const { traits: _, ...base } = operation;
  return mergeTraits(base, traits);
}

export function applyMessageTraits(
  message: NoReference<MessageObject>,
): NoReference<MessageObject> {
  const traits = message.traits;
  if (!traits || traits.length === 0) return message;

  const { traits: _, ...base } = message;
  return mergeTraits(base, traits);
}
