import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { sample } from 'openapi-sampler';

export function generateInput(
  method: string,
  schema: OpenAPI.SchemaObject,
): unknown {
  return sample(schema as object, {
    skipReadOnly: method !== 'GET',
    skipWriteOnly: method === 'GET',
  });
}
