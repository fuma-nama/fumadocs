import type { MessageObject } from '@/types';
import { resolveMultiFormatSchema } from '@/utils/schema';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { sample } from '@fumadocs/api-docs/schema/sample';

export interface ExampleMessageItem {
  id: string;
  name: string;
  description?: string;
  headers?: unknown;
  payload?: unknown;
}

export function getExampleMessages({
  message,
}: {
  message: NoReference<MessageObject>;
}): ExampleMessageItem[] {
  if (message.examples && message.examples.length > 0) {
    return message.examples.map((example, exampleIndex) => {
      return {
        id: example.name || String(exampleIndex),
        name: example.name || example.summary || `Example ${exampleIndex + 1}`,
        description: example.summary || message.description,
        headers: example.headers,
        payload: example.payload,
      };
    });
  }

  const headersSchema = resolveMultiFormatSchema(message.headers);
  const payload = resolveMultiFormatSchema(message.payload);

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
