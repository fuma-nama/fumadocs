import type {
  ExampleObject,
  HttpMethods,
  MediaTypeObject,
  MethodInformation,
  OperationObject,
  PathItemObject,
  TagObject,
} from '@/types';
import { idToTitle } from '@fumadocs/api-docs/utils/id-to-title';
import type { NoReference } from '@fumadocs/api-docs/schema';

export const methodKeys = ['get', 'post', 'patch', 'delete', 'head', 'put'] as const;

export type { ParsedSchema } from '@fumadocs/api-docs/schema';

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
