import type { MessageExampleObject, TagObject } from '@/types';
import { idToTitle } from '@fumadocs/api-docs/utils/id-to-title';

export type { ParsedSchema } from '@fumadocs/api-docs/schema';

export function getTagDisplayName(tag: TagObject): string {
  if ('x-displayName' in tag && typeof tag['x-displayName'] === 'string')
    return tag['x-displayName'];

  return idToTitle(tag.name);
}

export function pickMessageExample(example: MessageExampleObject): {
  headers?: unknown;
  payload?: unknown;
} {
  return {
    headers: example.headers,
    payload: example.payload,
  };
}

export function pickExample(value: {
  example?: unknown;
  examples?: MessageExampleObject[];
  default?: unknown;
}): unknown | undefined {
  if (value.example !== undefined) return value.example;
  if (value.default !== undefined) return value.default;

  if (value.examples && value.examples.length > 0) {
    const first = value.examples[0];
    return first.payload ?? first.headers;
  }
}
