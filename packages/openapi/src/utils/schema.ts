import type { ReferenceObject } from '@/types';
import type { OpenAPIV3_1 } from 'openapi-types';

export type NoReference<T> = T extends (infer I)[]
  ? NoReference<I>[]
  : T extends ReferenceObject
    ? Exclude<T, ReferenceObject>
    : T extends object
      ? {
          [K in keyof T]: NoReference<T[K]>;
        }
      : T;

export type ParsedSchema = OpenAPIV3_1.SchemaObject;

export function getPreferredType<B extends Record<string, unknown>>(
  body: B,
): keyof B | undefined {
  if ('application/json' in body) return 'application/json';

  return Object.keys(body)[0];
}

export function isNullable(
  schema: NoReference<ParsedSchema>,
  includeOneOf = true,
): boolean {
  if (Array.isArray(schema.type) && schema.type.includes('null')) return true;
  if (includeOneOf && (schema.anyOf || schema.oneOf)) {
    if (schema.anyOf?.some((item) => isNullable(item))) return true;
    if (schema.oneOf?.some((item) => isNullable(item))) return true;
  }

  return false;
}
