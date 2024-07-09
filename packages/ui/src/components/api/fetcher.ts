import type { BodyApiRequestValue } from '@/components/api/playground';

/**
 * Create request body from fields
 */
export function createBodyFromFields(
  fields: Record<string, unknown>,
  schema: BodyApiRequestValue[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(fields).map((key) => {
      const value = fields[key];
      const schemaItem = schema.find((item) => item.name === key);

      if (!schemaItem) {
        return [key, value];
      }

      return [key, convertValue(value, schemaItem)];
    }),
  );
}

/**
 * Convert a value (object and string) to the corresponding type of schema
 *
 * @param value - the original value
 * @param schema - the schema of field
 */
function convertValue(value: unknown, schema: BodyApiRequestValue): unknown {
  if (value === '' || value === undefined || value === null) {
    return schema.type === 'boolean' ? false : '';
  }

  if (Array.isArray(value)) {
    return value.map((item: unknown) => convertValue(item, schema));
  }

  if (typeof value === 'object')
    return createBodyFromFields(
      value as Record<string, unknown>,
      Array.isArray(schema.value) ? schema.value : [],
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
