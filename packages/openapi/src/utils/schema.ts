import { type JSONSchema } from 'json-schema-typed/draft-2020-12';
import { ReferenceObject } from '@/types';

export type NoReference<T> = T extends (infer I)[]
  ? NoReference<I>[]
  : T extends ReferenceObject
    ? Exclude<T, ReferenceObject>
    : T extends object
      ? {
          [K in keyof T]: NoReference<T[K]>;
        }
      : T;

type NoReferenceJSONSchema<T> = T extends (infer I)[]
  ? NoReference<I>[]
  : T extends { $ref?: string }
    ? Omit<T, '$ref'>
    : T;

export type ParsedSchema = JSONSchema;
export type ResolvedSchema = NoReferenceJSONSchema<ParsedSchema>;

export function getPreferredType<B extends Record<string, unknown>>(
  body: B,
): keyof B | undefined {
  if ('application/json' in body) return 'application/json';

  return Object.keys(body)[0];
}

export function isNullable(schema: ParsedSchema, includeOneOf = true): boolean {
  if (typeof schema === 'boolean') return false;

  if (Array.isArray(schema.type) && schema.type.includes('null')) return true;
  if (includeOneOf && (schema.anyOf || schema.oneOf)) {
    if (schema.anyOf?.some((item) => isNullable(item))) return true;
    if (schema.oneOf?.some((item) => isNullable(item))) return true;
  }

  return false;
}
