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
  messages,
}: {
  messages: NoReference<MessageObject>[];
}): ExampleMessageItem[] {
  const result: ExampleMessageItem[] = [];

  for (const message of messages) {
    const messageName = message.name || message.title || 'message';

    if (message.examples && message.examples.length > 0) {
      for (const [index, example] of message.examples.entries()) {
        const picked = pickMessageExample(example);
        result.push({
          id: `${messageName}-${example.name || index}`,
          name: example.name || example.summary || `${messageName} ${index + 1}`,
          description: example.summary || message.description,
          headers: picked.headers,
          payload: picked.payload,
        });
      }
      continue;
    }

    const headersSchema = resolveSchema(message.headers as MultiFormatSchemaObject);
    const payload = message.payload ?? resolveSchema(message.payload as MultiFormatSchemaObject);

    result.push({
      id: messageName,
      name: message.title || messageName,
      description: message.description,
      headers:
        headersSchema && typeof headersSchema === 'object'
          ? sample(headersSchema as object, { skipNonRequired: true })
          : pickExample(message as never),
      payload:
        payload && typeof payload === 'object'
          ? sample(payload as object, { skipNonRequired: true })
          : pickExample(message as never),
    });
  }

  if (result.length === 0) {
    result.push({
      id: '_default',
      name: 'Default',
    });
  }

  return result;
}
