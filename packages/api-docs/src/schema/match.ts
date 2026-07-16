import { deepEqual } from '@/utils/deep-equal';
import { isPlainObject } from '@/utils/is-plain-object';
import { dereferenceShallow } from '@/schema/dereference';
import type { ParsedSchema } from '.';

type JsonType = 'array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string';

function jsonTypeOf(value: unknown): JsonType | undefined {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'string':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'number':
      return Number.isInteger(value) ? 'integer' : 'number';
    case 'object':
      return Array.isArray(value) ? 'array' : 'object';
  }
}

export function typeMatches(value: unknown, type: JsonType): boolean {
  const actual = jsonTypeOf(value);
  if (actual === undefined) return false;
  // an integer is also a valid `number`
  return actual === type || (type === 'number' && actual === 'integer');
}

/**
 * Best-effort check of whether `value` structurally belongs to `schema`, used only
 * to pick the initial `oneOf`/`anyOf` member of a field.
 */
export function matchesSchema(schema: ParsedSchema, value: unknown): boolean {
  return match(schema, value, new Set());
}

function match(schema: ParsedSchema, value: unknown, seen: Set<object>): boolean {
  if (value === undefined) return false;

  const resolved = dereferenceShallow(schema);
  if (typeof resolved === 'boolean') return resolved;

  if (seen.has(resolved)) return true;
  seen.add(resolved);

  if (resolved.const !== undefined) return deepEqual(value, resolved.const);
  if (Array.isArray(resolved.enum)) return resolved.enum.some((item) => deepEqual(value, item));

  if (Array.isArray(resolved.allOf) && !resolved.allOf.every((s) => match(s, value, seen))) {
    return false;
  }
  if (Array.isArray(resolved.anyOf) && !resolved.anyOf.some((s) => match(s, value, seen))) {
    return false;
  }
  if (Array.isArray(resolved.oneOf) && !resolved.oneOf.some((s) => match(s, value, seen))) {
    return false;
  }
  if (resolved.not !== undefined && match(resolved.not, value, seen)) {
    return false;
  }

  if (resolved.type !== undefined) {
    const types = Array.isArray(resolved.type) ? resolved.type : [resolved.type];
    if (types.every((type) => !typeMatches(value, type))) return false;
  }

  if (isPlainObject(value)) {
    // all required properties should be present
    if (
      Array.isArray(resolved.required) &&
      resolved.required.some((key) => value[key] === undefined)
    ) {
      return false;
    }

    const properties = resolved.properties ?? {};
    for (const key in properties) {
      const property = properties[key];
      if (value[key] === undefined || property === undefined) continue;
      if (!match(property, value[key], new Set())) return false;
    }
  }

  if (Array.isArray(value)) {
    const items = resolved.items;
    if (items !== undefined && typeof items !== 'boolean') {
      if (value.some((item) => !match(items, item, new Set()))) return false;
    }
  }

  return true;
}
