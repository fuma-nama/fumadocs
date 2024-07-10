import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import { noRef } from '@/utils/schema';

type Security = OpenAPI.SecuritySchemeObject & {
  scopes: string[];
};

export function getScheme(
  requirement: OpenAPI.SecurityRequirementObject,
  document: OpenAPI.Document,
): Security[] {
  const results: Security[] = [];
  const schemas = document.components?.securitySchemes ?? {};

  for (const [key, scopes] of Object.entries(requirement)) {
    if (!(key in schemas)) return [];
    const schema = noRef(schemas[key]);

    results.push({
      ...schema,
      scopes,
    });
  }

  return results;
}
