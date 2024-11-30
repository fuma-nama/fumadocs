import type {
  Document,
  SecurityRequirementObject,
  SecuritySchemeObject,
} from '@/types';
import { type NoReference } from '@/utils/schema';

export type Security = SecuritySchemeObject & {
  scopes: string[];
};

export function getSecurities(
  requirement: NoReference<SecurityRequirementObject>,
  document: NoReference<Document>,
): Security[] {
  const results: Security[] = [];
  const schemas = document.components?.securitySchemes ?? {};

  for (const [key, scopes] of Object.entries(requirement)) {
    if (!(key in schemas)) return [];
    const schema = schemas[key];

    results.push({
      ...schema,
      scopes,
    });
  }

  return results;
}

export function getSecurityPrefix(security: Security): string | undefined {
  if (security.type === 'http')
    return {
      basic: 'Basic',
      bearer: 'Bearer',
    }[security.scheme];

  if (security.type === 'oauth2') return 'Bearer';
}
