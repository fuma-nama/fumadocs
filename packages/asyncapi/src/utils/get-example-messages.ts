import type { MessageObject } from '@/types';
import { resolveMultiFormatSchema } from '@/utils/schema';
import { sample } from '@fumadocs/api-docs/schema/sample';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import { getRaw } from '@scalar/json-magic/magic-proxy';

export interface ExampleMessageItem {
  id: string;
  name: string;
  description?: string;
  headers?: unknown;
  payload?: unknown;
}

export function getExampleMessages({ message }: { message: MessageObject }): ExampleMessageItem[] {
  if (message.examples && message.examples.length > 0) {
    return message.examples.map((example, exampleIndex) => {
      return {
        id: example.name || String(exampleIndex),
        name: example.name || example.summary || `Example ${exampleIndex + 1}`,
        description: example.summary || message.description,
        // `getRaw` unwraps magic proxies, example values must be plain objects
        headers: getRaw(example.headers),
        payload: getRaw(example.payload),
      };
    });
  }

  const headersSchema = resolveMultiFormatSchema(dereferenceShallow(message.headers));
  const payload = resolveMultiFormatSchema(dereferenceShallow(message.payload));

  return [
    {
      id: 'default',
      name: 'Example',
      description: message.description,
      headers:
        headersSchema && typeof headersSchema === 'object'
          ? sample(headersSchema as object)
          : undefined,
      payload: payload && typeof payload === 'object' ? sample(payload as object) : undefined,
    },
  ];
}
