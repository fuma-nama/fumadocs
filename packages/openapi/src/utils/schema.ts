import type { ReferenceObject, SchemaObject } from '@/types';
import type { OpenAPIV3_1 } from 'openapi-types';

export type NoReference<T> = T extends (infer I)[]
  ? NoReference<I>[]
  : Exclude<T, ReferenceObject>;

export function noRef<T>(v: T): NoReference<T> {
  return v as NoReference<T>;
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

export type ParsedSchema = OpenAPIV3_1.SchemaObject;

export function normalizeSchema(schema: SchemaObject): ParsedSchema {
  let parsed: ParsedSchema = { ...schema };

  if ('nullable' in schema) {
    if (!schema.type) {
      parsed = {
        oneOf: [
          parsed,
          {
            type: 'null',
          },
        ],
      };
    } else {
      parsed.type = [schema.type, 'null'];
    }
  }

  if (typeof schema.exclusiveMinimum === 'boolean') {
    parsed.exclusiveMinimum = schema.minimum;
    delete parsed.minimum;
  }

  if (typeof schema.exclusiveMaximum === 'boolean') {
    parsed.exclusiveMaximum = schema.maximum;
    delete parsed.maximum;
  }

  if (schema.example && !parsed.examples) {
    parsed.examples = [schema.example];
    delete parsed.example;
  }

  return parsed;
}

export function isNullable(schema: ParsedSchema, includeOneOf = true): boolean {
  if (Array.isArray(schema.type) && schema.type.includes('null')) return true;
  if (includeOneOf && (schema.anyOf || schema.oneOf)) {
    if (
      schema.anyOf?.some((item) => isNullable(item as NoReference<typeof item>))
    )
      return true;
    if (
      schema.oneOf?.some((item) => isNullable(item as NoReference<typeof item>))
    )
      return true;
  }

  return false;
}
