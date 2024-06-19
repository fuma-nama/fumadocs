import type { OpenAPIV3 as OpenAPI } from 'openapi-types';

type NoReference<T> = Exclude<T, OpenAPI.ReferenceObject>;

export function noRef<T>(v: T): NoReference<T> {
  return v as NoReference<T>;
}

export function getPreferredMedia<T>(body: Record<string, T>): T | undefined {
  if (Object.keys(body).length === 0) return undefined;

  if ('application/json' in body) return body['application/json'];

  return Object.values(body)[0];
}

/**
 * Get Path
 */
export function toSampleInput(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
