import type { MessageObject, MultiFormatSchemaObject } from '@/types';
import { pickExample, pickMessageExample } from '@/utils/schema';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { sample } from '@fumadocs/api-docs/schema/sample';
import { resolveSchema } from '@/utils/operation';

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
      const picked = pickMessageExample(example);

      return {
        id: example.name || String(exampleIndex),
        name: example.name || example.summary || `Example ${exampleIndex + 1}`,
        description: example.summary || message.description,
        headers: picked.headers,
        payload: picked.payload,
      };
    });
  }

  const headersSchema = resolveSchema(message.headers as MultiFormatSchemaObject);
  const payload = message.payload ?? resolveSchema(message.payload as MultiFormatSchemaObject);

  return [
    {
      id: 'default',
      name: 'Example',
      description: message.description,
      headers:
        headersSchema && typeof headersSchema === 'object'
          ? sample(headersSchema as object)
          : pickExample(message as never),
      payload:
        payload && typeof payload === 'object'
          ? sample(payload as object)
          : pickExample(message as never),
    },
  ];
}
