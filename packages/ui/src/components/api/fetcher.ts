import type { RequestSchema } from 'fumadocs-openapi';
import { resolve } from '@/components/api/shared';

/**
 * Create request body from value
 */
export function createBodyFromValue(
  value: unknown,
  schema: RequestSchema,
  references: Record<string, RequestSchema>,
): unknown {
  return convertValue(value, schema, references);
}

/**
 * Convert a value (object or string) to the corresponding type of schema
 *
 * @param value - the original value
 * @param schema - the schema of field
 * @param references - schema references
 */
function convertValue(
  value: unknown,
  schema: RequestSchema,
  references: Record<string, RequestSchema>,
): unknown {
  if (value === '' || value === undefined || value === null) {
    return schema.type === 'boolean' ? false : '';
  }

  if (Array.isArray(value)) {
    return value.map((item: unknown) => convertValue(item, schema, references));
  }

  if (typeof value === 'object' && schema.type === 'object')
    return Object.fromEntries(
      Object.keys(value).map((key) => {
        const prop = value[key as keyof typeof value];

        if (key in schema.properties) {
          return [
            key,
            convertValue(
              prop,
              resolve(schema.properties[key], references),
              references,
            ),
          ];
        }

        return [key, prop];
      }),
    );

  switch (schema.type) {
    case 'number':
      return Number(value);
    case 'boolean':
      return Boolean(value);
    case 'string':
    default:
      return String(value);
  }
}
