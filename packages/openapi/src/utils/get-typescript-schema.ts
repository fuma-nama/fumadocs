import { compile } from '@fumari/json-schema-to-typescript';
import type { EndpointSample } from '@/schema/sample';

export async function getTypescriptSchema(
  endpoint: EndpointSample,
  code: string,
): Promise<string | undefined> {
  if (code in endpoint.responses) {
    return compile(endpoint.responses[code].schema, 'Response', {
      $refOptions: false,
      bannerComment: '',
      additionalProperties: false,
      format: true,
      enableConstEnums: false,
    });
  }
}
