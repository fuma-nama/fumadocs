import { isNullable, type ResolvedSchema } from '@/utils/schema';

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
      .join(' | ');
  }

  if (schema.type === 'array')
    return `array<${schema.items ? schemaToString(schema.items) : 'unknown'}>`;

  if (schema.oneOf) {
    return schema.oneOf
      .map((one) => schemaToString(one, false))
      .filter((v) => v !== 'unknown')
      .join(' | ');
  }

  if (schema.allOf) {
    return schema.allOf
      .map((one) => schemaToString(one, false))
      .filter((v) => v !== 'unknown')
      .join(' & ');
  }

  if (schema.not) return `not ${schemaToString(schema.not, false)}`;

  if (schema.anyOf) {
    const union = schema.anyOf
      .map((one) => schemaToString(one, false))
      .filter((v) => v !== 'unknown');

    if (union.length > 1) {
      return `Any properties in ${union.join(',')}`;
    } else if (union.length === 1) {
      return union[0];
    }
  }

  if (schema.type === 'string' && schema.format === 'binary') return 'file';

  if (schema.type && Array.isArray(schema.type)) {
    const nonNullTypes = schema.type.filter((v) => v !== 'null');

    if (nonNullTypes.length > 0) return nonNullTypes.join(' | ');
  } else if (schema.type && schema.type !== 'null') {
    return schema.type as string;
  }

  if (typeof schema.type === 'string') return schema.type;

  return 'unknown';
}
