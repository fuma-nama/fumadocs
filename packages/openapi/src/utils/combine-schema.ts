import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import { noRef } from '@/utils/schema';

/**
 * Combine multiple object schemas into one
 */
export function combineSchema(
  schema: OpenAPI.SchemaObject[],
): OpenAPI.SchemaObject {
  const result: OpenAPI.SchemaObject = {
    type: undefined,
  };

  function add(s: OpenAPI.SchemaObject): void {
    if (s.type) {
      result.type = result.type ? 'object' : s.type;
    }

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

    if (s.enum?.length > 0) {
      result.enum ??= [];
      result.enum.push(...s.enum);
    }

    if (s.nullable) {
      result.nullable = true;
    }

    if (s.allOf) {
      noRef(s.allOf).forEach(add);
    }
  }

  schema.forEach(add);

  return result;
}
