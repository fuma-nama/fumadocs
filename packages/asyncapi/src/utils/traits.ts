import type { MessageObject, OperationObject, RenderContext } from '@/types';
import { isPlainObject } from './is-plain-object';

type Resolve = RenderContext['schema']['resolve'];

/**
 * Merge traits into a target object per the AsyncAPI traits merge mechanism.
 * @see https://github.com/asyncapi/spec/blob/v3.0.0/spec/asyncapi.md#traitsMergeMechanism
 */
export function mergeTraits<T extends object>(target: T, traits: object[]): T {
  let result: Record<string, unknown> = { ...target } as Record<string, unknown>;
  for (const trait of traits) {
    result = mergeTraitLayer(result, trait as Record<string, unknown>);
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
  operation: OperationObject,
  resolve: Resolve,
): OperationObject {
  const traits = operation.traits;
  if (!traits || traits.length === 0) return operation;

  const { traits: _, ...base } = operation;
  return mergeTraits(
    base,
    traits.map((trait) => resolve(trait)),
  ) as OperationObject;
}

export function applyMessageTraits(message: MessageObject, resolve: Resolve): MessageObject {
  const traits = message.traits;
  if (!traits || traits.length === 0) return message;

  const { traits: _, ...base } = message;
  return mergeTraits(
    base,
    traits.map((trait) => resolve(trait)),
  ) as MessageObject;
}
