import type { ReferenceObject } from '@/types';
import type { OpenAPIV3_1 } from 'openapi-types';
import { js2xml, type ElementCompact } from 'xml-js';

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

/**
 * Convert input to string (with quotes)
 */
export function inputToString(
  value: unknown,
  mediaType = 'application/json',
  multiLine: 'single-quote' | 'backtick' | 'none' = 'none',
): string {
  const getStr = (v: string) => {
    if (multiLine === 'none') return JSON.stringify(v);

    const delimit = multiLine === 'backtick' ? `\`` : `'`;
    return `${delimit}${v.replaceAll(delimit, `\\${delimit}`)}${delimit}`;
  };

  if (typeof value === 'string') return getStr(value);

  if (mediaType === 'application/json' || mediaType === 'multipart/form-data') {
    return getStr(JSON.stringify(value, null, 2));
  }

  if (mediaType === 'application/xml') {
    return getStr(
      js2xml(value as ElementCompact, { compact: true, spaces: 2 }),
    );
  }

  throw new Error(`Unsupported media type: ${mediaType}`);
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
