import { type RequestSchema } from '@/playground/index';

/**
 * Resolve reference
 */
export function resolve<T>(
  schema: T,
  references: Record<string, RequestSchema>,
): T {
  if (!schema || typeof schema !== 'object') return schema;

  if (Array.isArray(schema))
    return schema.map((item) => resolve(item, references)) as T;

  if ('$ref' in schema && schema.$ref) {
    return resolve(references[schema.$ref as string], references) as T;
  }

  for (const key in schema) {
    schema[key] = resolve(schema[key], references);
  }

  return schema;
}
