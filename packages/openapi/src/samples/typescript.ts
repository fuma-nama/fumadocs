import { compile } from 'json-schema-to-typescript';
import type { Endpoint } from '.';

export async function getTypescript(
  endpoint: Endpoint,
  code: string,
): Promise<string | undefined> {
  if (code in endpoint.responses) {
    return compile(endpoint.responses[code].schema, 'Response', {
      bannerComment: '',
      additionalProperties: false,
      format: true,
      enableConstEnums: false,
    });
  }
}
