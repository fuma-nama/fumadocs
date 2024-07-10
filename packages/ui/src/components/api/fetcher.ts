import type { RequestField } from 'fumadocs-openapi';

/**
 * Create request body from value
 */
export function createBodyFromValue(
  value: unknown,
  schema: RequestField,
): unknown {
  return convertValue(value, schema);
}

/**
 * Convert a value (object or string) to the corresponding type of schema
 *
 * @param value - the original value
 * @param schema - the schema of field
 */
function convertValue(value: unknown, schema: RequestField): unknown {
  if (value === '' || value === undefined || value === null) {
    return schema.type === 'boolean' ? false : '';
  }

  if (Array.isArray(value)) {
    return value.map((item: unknown) => convertValue(item, schema));
  }

  if (typeof value === 'object' && schema.type === 'object')
    return Object.fromEntries(
      Object.keys(value).map((key) => {
        const prop = value[key as keyof typeof value];
        const schemaItem = schema.properties.find((item) => item.name === key);

        if (!schemaItem) {
          return [key, prop];
        }

        return [key, convertValue(prop, schemaItem)];
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
