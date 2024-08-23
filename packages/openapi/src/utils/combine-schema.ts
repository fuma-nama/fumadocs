import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import { noRef } from '@/utils/schema';

/**
 * Combine multiple object schemas into one
 */
export function combineSchema(
  schema: OpenAPI.SchemaObject[],
): OpenAPI.SchemaObject {
  const result: OpenAPI.SchemaObject = {
    type: 'object',
  };

  function add(s: OpenAPI.SchemaObject): void {
    if (s.properties) {
      result.properties ??= {};
      Object.assign(result.properties, s.properties);
    }

    if (s.additionalProperties === true) {
      result.additionalProperties = true;
    } else if (
      s.additionalProperties &&
      typeof result.additionalProperties !== 'boolean'
    ) {
      result.additionalProperties ??= {};
      Object.assign(result.additionalProperties, s.additionalProperties);
    }

    if (s.required) {
      result.required ??= [];
      result.required.push(...s.required);
    }

    if (s.allOf) {
      noRef(s.allOf).forEach(add);
    }
  }

  schema.forEach(add);

  return result;
}
