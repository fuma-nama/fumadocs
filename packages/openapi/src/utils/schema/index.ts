import type { JSONSchema } from 'json-schema-typed/draft-2020-12';
import type {
  Document,
  ExampleObject,
  HttpMethods,
  MediaTypeObject,
  MethodInformation,
  OperationObject,
  PathItemObject,
  ReferenceObject,
  TagObject,
} from '@/types';
import { idToTitle } from '@/utils/id-to-title';

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

export type NoReferenceSwallow<T> = T extends ReferenceObject ? Exclude<T, ReferenceObject> : T;

export type ParsedSchema =
  | (JSONSchema & {
      'x-playground-lazy'?: boolean;
    })
  | boolean;

export function getPreferredType(body: Record<string, unknown>): string | undefined {
  if ('application/json' in body) return 'application/json';

  return Object.keys(body)[0];
}

export function getTagDisplayName(tag: TagObject): string {
  if ('x-displayName' in tag && typeof tag['x-displayName'] === 'string')
    return tag['x-displayName'];

  if (tag.summary) return tag.summary;
  return idToTitle(tag.name!);
}

/**
 * Summarize method endpoint information
 */
export function createMethod(
  method: HttpMethods,
  path: NoReference<PathItemObject>,
  operation: NoReference<OperationObject>,
): MethodInformation {
  return {
    description: path.description,
    summary: path.summary,
    ...operation,
    servers: operation.servers ?? path.servers,
    parameters: [...(operation.parameters ?? []), ...(path.parameters ?? [])],
    method,
  };
}

interface ExampleLike {
  example?: unknown;
  examples?: {
    [media: string]: ExampleObject;
  };
  content?: {
    [media: string]: MediaTypeObject;
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

export interface SecurityEntry {
  scopes: string[];
  id: string;
}

export function parseSecurities(
  method: MethodInformation,
  dereferenced: NoReference<Document>,
): SecurityEntry[][] {
  const result: SecurityEntry[][] = [];
  const security = method.security ?? dereferenced.security ?? [];
  if (security.length === 0) return result;

  for (const map of security) {
    const list: SecurityEntry[] = [];

    for (const [key, scopes] of Object.entries(map)) {
      list.push({
        id: key,
        scopes,
      });
    }

    if (list.length > 0) result.push(list);
  }

  return result;
}
