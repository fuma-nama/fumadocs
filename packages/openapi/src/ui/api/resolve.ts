import { type ReferenceSchema, type RequestSchema } from '@/render/playground';

/**
 * Resolve reference
 */
export function resolve(
  schema: RequestSchema | ReferenceSchema | string,
  references: Record<string, RequestSchema>,
): RequestSchema {
  if (typeof schema === 'string') return references[schema];
  if (schema.type !== 'ref') return schema;

  return {
    ...references[schema.schema],
    description: schema.description,
    isRequired: schema.isRequired,
  };
}
