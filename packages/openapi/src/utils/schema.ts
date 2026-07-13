import type { ExampleObject, MediaTypeObject, TagObject } from '@/types';
import { idToTitle } from '@fumadocs/api-docs/utils/id-to-title';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import { getRaw } from '@scalar/json-magic/magic-proxy';

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
  // `getRaw` unwraps magic proxies, example values must be plain objects
  if (value.example !== undefined) {
    return getRaw(value.example);
  }

  if (value.content) {
    const type = getPreferredType(value.content);
    const content = type ? dereferenceShallow(value.content[type]) : undefined;

    if (type && content) {
      const example = value.examples?.[type];
      const out =
        (example !== undefined ? getRaw(dereferenceShallow(example).value) : undefined) ??
        pickExample(content);
      if (out !== undefined) return out;
    }
  }

  if (value.examples) {
    const examples = Object.values(value.examples);
    if (examples.length > 0) return getRaw(dereferenceShallow(examples[0]).value);
  }
}
