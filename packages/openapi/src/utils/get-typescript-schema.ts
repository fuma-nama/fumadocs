import { compile } from '@fumari/json-schema-to-typescript';
import type { DereferenceMap } from '@/types';

export async function getTypescriptSchema(
  schema: object,
  dereferenceMap: DereferenceMap,
): Promise<string | undefined> {
  return compile(
    // re-running on the same schema results in error
    // because it uses `defineProperty` to define internal references
    // we clone the schema to fix this problem
    JSON.parse(JSON.stringify(schema)),
    'Response',
    {
      $refOptions: false,
      schemaToId: dereferenceMap,
      bannerComment: '',
      additionalProperties: false,
      format: true,
      enableConstEnums: false,
    },
  );
}
