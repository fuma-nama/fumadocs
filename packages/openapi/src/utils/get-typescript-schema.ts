import type { SchemaObject } from 'ajv';
import type { RenderContext } from '@/types';

export async function getTypescriptSchema(
  schema: SchemaObject,
  ctx: RenderContext,
): Promise<string | undefined> {
  const { compile } = await import('@fumari/json-schema-to-typescript');

  try {
    const input = structuredClone({
      schema,
      idToSchema: ctx.schema._internal_idToSchema(),
    });

    const schemaToId = new WeakMap<object, string>();

    for (const [k, v] of input.idToSchema) {
      schemaToId.set(v, k);
    }

    return await compile(input.schema, 'Response', {
      enableConstEnums: false,
      schemaToId,
    });
  } catch (e) {
    console.warn('Failed to generate typescript schema:', e);
  }
}
