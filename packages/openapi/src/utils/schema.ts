import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import type {
  MethodInformation,
  OperationObject,
  PathItemObject,
  ReferenceObject,
  TagObject,
} from '@/types';
import { idToTitle } from '@/utils/id-to-title';
import { OpenAPIV3_1 } from 'openapi-types';

export const methodKeys = ['get', 'post', 'patch', 'delete', 'head', 'put'] as const;

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

export function getPreferredType(body: Record<string, unknown>): string | undefined {
  if ('application/json' in body) return 'application/json';

  return Object.keys(body)[0];
}

export function getTagDisplayName(tag: TagObject): string {
  return 'x-displayName' in tag && typeof tag['x-displayName'] === 'string'
    ? tag['x-displayName']
    : idToTitle(tag.name);
}

/**
 * Summarize method endpoint information
 */
export function createMethod(
  method: string,
  path: NoReference<PathItemObject>,
  operation: NoReference<OperationObject>,
): MethodInformation {
  return {
    description: path.description,
    summary: path.summary,
    ...operation,
    parameters: [...(operation.parameters ?? []), ...(path.parameters ?? [])],
    method: method.toUpperCase(),
  };
}

interface ExampleLike {
  example?: unknown;
  examples?: {
    [media: string]: OpenAPIV3_1.ExampleObject;
  };
  content?: {
    [media: string]: OpenAPIV3_1.MediaTypeObject;
  };
}

export function pickExample(value: ExampleLike): unknown | undefined {
  if (value.example !== undefined) {
    return value.example;
  }

  if (value.content) {
    const type = getPreferredType(value.content);
    const content = type ? value.content[type] : undefined;

    if (type && content) {
      const out = value.examples?.[type].value ?? pickExample(content);
      if (out !== undefined) return out;
    }
  }

  if (value.examples) {
    const examples = Object.values(value.examples);
    if (examples.length > 0) return examples[0].value;
  }
}
