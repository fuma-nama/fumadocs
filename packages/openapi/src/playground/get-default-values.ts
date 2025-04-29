import type { JSONSchema } from 'json-schema-typed';
import type { RequestSchema } from '@/playground/index';

export function getDefaultValue(
  type: JSONSchema.TypeValue,
  schema?: RequestSchema,
): unknown {
  if (Array.isArray(type)) return getDefaultValue(type[0], schema);

  if (type === 'object' && typeof schema === 'object')
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, prop]) => {
        return [
          key,
          getDefaultValue(
            typeof prop === 'object' ? (prop.type ?? 'string') : 'string',
            prop,
          ),
        ];
      }),
    );

  if (type === 'array') return [];
  if (type === 'null') return null;
  if (type === 'string') {
    if (typeof schema === 'object' && schema.format === 'binary')
      return undefined;

    return '';
  }
  if (type === 'number' || type === 'integer') return 0;
  if (type === 'boolean') return false;
}
