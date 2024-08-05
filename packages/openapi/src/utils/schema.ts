import type { OpenAPIV3 as OpenAPI } from 'openapi-types';

type NoReference<T> = Exclude<T, OpenAPI.ReferenceObject>;

export function noRef<T>(v: T): NoReference<T> {
  return v as NoReference<T>;
}

export function getPreferredMedia<T>(body: Record<string, T>): T | undefined {
  const type = getPreferredType(body);
  if (type) return body[type];
}

export function getPreferredType<B extends Record<string, unknown>>(
  body: B,
): keyof B | undefined {
  if ('application/json' in body) return 'application/json';

  return Object.keys(body)[0];
}

/**
 * Convert to JSON string if necessary
 */
export function toSampleInput(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
