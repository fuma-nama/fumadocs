import { type ParsedSchema, type ResolvedSchema } from '@/utils/schema';

export function schemaToString(schema: ResolvedSchema, isRoot = true): string {
  if (schema === true) return 'any';
  else if (schema === false) return 'never';

  if (isNullable(schema) && isRoot) {
    const type = schemaToString(schema, false);

    // null if schema only contains `nullable`
    return type === 'unknown' ? 'null' : `${type} | null`;
  }

  if (schema.title) return schema.title;

  if (Array.isArray(schema.type)) {
    return schema.type
      .map((type) =>
        schemaToString(
          {
            ...schema,
            type,
          },
          false,
        ),
      )
      .filter((v) => v !== 'unknown' && v !== 'null')
      .join(' | ');
  }

  if (schema.type === 'array')
    return `array<${schema.items ? schemaToString(schema.items) : 'unknown'}>`;

  if (schema.oneOf) {
    return schema.oneOf
      .map((one) => schemaToString(one, false))
      .filter((v) => v !== 'unknown' && v !== 'null')
      .join(' | ');
  }

  const combinedOf = schema.anyOf ?? schema.allOf;
  if (combinedOf) {
    return combinedOf
      .map((one) => schemaToString(one, false))
      .filter((v) => v !== 'unknown' && v !== 'null')
      .join(' & ');
  }

  if (schema.not) return `not ${schemaToString(schema.not, false)}`;
  if (schema.type === 'string' && schema.format === 'binary') return 'file';

  if (schema.type && Array.isArray(schema.type)) {
    return schema.type.filter((v) => v !== 'null').join(' | ');
  }

  if (schema.type) {
    return schema.type as string;
  }

  return 'unknown';
}

function isNullable(schema: ParsedSchema): boolean {
  if (typeof schema === 'boolean') return false;

  if (Array.isArray(schema.type) && schema.type.includes('null')) return true;
  const combined = schema.anyOf ?? schema.oneOf ?? schema.allOf;
  if (combined && combined.some(isNullable)) return true;

  return schema.type === 'null';
}
