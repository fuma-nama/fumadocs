import type { RequestSchema } from '@/playground/index';

export function getDefaultValue(schema: RequestSchema): unknown {
  if (typeof schema === 'boolean') return null;

  const type = schema.type;
  if (Array.isArray(type))
    return getDefaultValue({
      ...schema,
      type: type[0],
    });

  if (type === 'object' && typeof schema === 'object')
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, prop]) => {
        return [key, getDefaultValue(prop)];
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
