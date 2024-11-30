import { compile } from '@fumari/json-schema-to-typescript';
import type { EndpointSample } from '@/utils/generate-sample';
import { DereferenceMap } from '@/types';

export async function getTypescriptSchema(
  endpoint: EndpointSample,
  code: string,
  dereferenceMap: DereferenceMap,
): Promise<string | undefined> {
  if (code in endpoint.responses) {
    return compile(
      // re-running on the same schema results in error
      // because it uses `defineProperty` to define internal references
      // we clone the schema to fix this problem
      // @ts-expect-error any types
      endpoint.responses[code].schema,
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
}
