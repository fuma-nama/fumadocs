import { compile } from '@fumari/json-schema-to-typescript';
import type { DereferenceMap } from '@/types';

export async function getTypescriptSchema(
  schema: object,
  dereferenceMap: DereferenceMap,
): Promise<string | undefined> {
  const cloned = structuredClone({ schema, dereferenceMap });
  return compile(cloned.schema, 'Response', {
    $refOptions: false,
    schemaToId: cloned.dereferenceMap,
    bannerComment: '',
    additionalProperties: false,
    enableConstEnums: false,
  });
}
