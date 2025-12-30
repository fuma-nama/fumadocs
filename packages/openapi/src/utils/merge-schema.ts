import { type ParsedSchema } from '@/utils/schema';
import { deepEqual } from './deep-equal';

/**
 * Merge `allOf` object schema
 */
export function mergeAllOf(schema: ParsedSchema): ParsedSchema {
  if (typeof schema === 'boolean' || !schema.allOf) return schema;

  const { allOf, ...rest } = schema;
  let result: ParsedSchema = rest;
  for (const item of allOf) {
    result = intersection(result, item);
  }
  return result;
}

export function intersection(a: ParsedSchema, b: ParsedSchema): ParsedSchema {
  a = mergeAllOf(a);
  b = mergeAllOf(b);
  if (typeof a === 'boolean' && typeof b === 'boolean') return a && b;
  if (typeof a === 'boolean') return a;
  if (typeof b === 'boolean') return b;

  const result: ParsedSchema = { ...a };
  for (const _k in b) {
    const key = _k as keyof typeof b;

    switch (key) {
      case '$id':
      case '$comment':
      case 'description':
      case 'additionalItems':
      case 'examples':
      case 'allOf':
      case 'writeOnly':
      case 'readOnly':
        // ignored
        break;
      case 'title': {
        const value = b[key];
        if (value === undefined) break;
        if (result[key]) {
          result[key] = `${result[key]} & ${value}`;
        } else {
          result[key] = value;
        }
        break;
      }
      case 'minItems':
      case 'minimum':
      case 'exclusiveMinimum':
      case 'minProperties':
      case 'minContains':
      case 'minLength': {
        const value = b[key];
        if (value === undefined) break;
        result[key] = result[key] === undefined ? value : Math.max(result[key], value);
        break;
      }
      case 'maxContains':
      case 'maxItems':
      case 'maxLength':
      case 'maxProperties':
      case 'maximum':
      case 'exclusiveMaximum': {
        const value = b[key];
        if (value === undefined) break;
        result[key] = result[key] === undefined ? value : Math.min(result[key], value);
        break;
      }
      // intersection
      case 'enum':
      case 'anyOf':
      case 'oneOf': {
        const value = b[key];
        if (value === undefined) break;

        result[key] = result[key] === undefined ? value : intersectArray(result[key], value);
        break;
      }
      // require same
      case 'format':
      case 'const':
      case 'type': {
        const value = b[key];
        if (value === undefined) break;
        result[key] ??= value;

        if (!deepEqual(result[key], value)) return false;
        break;
      }
      // add
      case 'required': {
        const value = b[key];
        if (value === undefined) break;
        result[key] = [...(result[key] ?? []), ...value];
        break;
      }
      case 'properties':
      case 'patternProperties': {
        const value = b[key];
        if (value === undefined) break;

        if (result[key] === undefined) {
          result[key] = value;
          break;
        }

        const out: Record<string, ParsedSchema> = {};
        const allProps = new Set<string>();
        for (const k in result[key]) allProps.add(k);
        for (const k in value) allProps.add(k);

        for (const prop of allProps) {
          const aProp = result[key][prop];
          const bProp = value[prop];
          if (aProp === undefined) {
            out[prop] = bProp;
          } else if (bProp === undefined) {
            out[prop] = aProp;
          } else {
            out[prop] = intersection(aProp, bProp);
          }
        }

        result[key] = out;
        break;
      }
      case 'additionalProperties':
      case 'contains':
      case 'items': {
        const value = b[key];
        if (value === undefined) break;

        result[key] = result[key] === undefined ? value : intersection(result[key], value);
        break;
      }
      case 'not': {
        const value = b[key];
        if (value === undefined) break;

        if (result[key] && value) {
          result.not = { anyOf: [result[key], value] };
        } else if (value) {
          result.not = value;
        }
        break;
      }
      default:
        result[key] = b[key];
    }
  }

  return result;
}

function intersectArray<T>(a: readonly T[], b: readonly T[]): T[] {
  const out = new Set<T>();
  for (const item of a) {
    if (b.includes(item)) out.add(item);
  }
  for (const item of b) {
    if (a.includes(item)) out.add(item);
  }
  return Array.from(out);
}
