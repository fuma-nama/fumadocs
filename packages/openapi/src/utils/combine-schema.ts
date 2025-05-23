import { type ParsedSchema } from '@/utils/schema';

/**
 * Combine multiple object schemas into one
 */
export function combineSchema(schema: ParsedSchema[]): ParsedSchema {
  let result: ParsedSchema = {};
  const types = new Set<string>();
  const title = new Set<string>();

  function add(s: ParsedSchema): void {
    if (typeof s === 'boolean') {
      result = s;
      return;
    }

    if (typeof result === 'boolean') return;

    if (s.title) title.add(s.title);
    if (s.type) {
      for (const v of Array.isArray(s.type) ? s.type : [s.type]) {
        types.add(v);
      }
    }

    for (const key of ['oneOf', 'required', 'enum'] as const) {
      if (!s[key]) continue;

      result[key] = [...s[key], ...(result[key] ?? [])];
    }

    for (const key of ['properties', 'patternProperties'] as const) {
      if (!s[key]) continue;

      result[key] ??= {};
      Object.assign(result[key], s[key]);
    }

    if (s.additionalProperties === true) {
      result.additionalProperties = true;
    } else if (
      s.additionalProperties &&
      typeof result.additionalProperties !== 'boolean'
    ) {
      result.additionalProperties ??= {};
      Object.assign(result.additionalProperties, s.additionalProperties);
    }

    (s.allOf ?? s.anyOf)?.forEach(add);
  }

  schema.forEach(add);

  if (title.size > 0) result.title = Array.from(title).join(' & ');
  if (types.size > 0) {
    const typeArr = Array.from(types.values());
    result.type = typeArr.length === 1 ? typeArr[0] : typeArr;
  }

  return result;
}
