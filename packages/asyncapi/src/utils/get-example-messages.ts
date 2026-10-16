import type { MessageObject } from '@/types';
import type { MessageSchema } from '@/utils/schema';
import { type JsonSchema, sample } from '@fumadocs/json-schema';
import { getRaw } from '@scalar/json-magic/magic-proxy';

export interface ExampleMessageItem {
  /** unique in the message */
  id: string;
  name: string;
  /** the summary of example */
  description?: string;
  headers?: unknown;
  payload?: unknown;
}

/**
 * The examples of a message, or one generated from its schemas when it has none with headers or payload.
 */
export function getExampleMessages(
  message: MessageObject,
  {
    headers,
    payload,
    received,
  }: { headers?: MessageSchema; payload?: MessageSchema; received: boolean },
): ExampleMessageItem[] {
  const out: ExampleMessageItem[] = [];
  const examples = message.examples ?? [];

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    if (example.headers === undefined && example.payload === undefined) continue;
    // `getRaw` unwraps magic proxies, example values must be plain objects
    out.push({
      id: String(i),
      name: example.name || `Example ${i + 1}`,
      description: example.summary,
      headers: getRaw(example.headers),
      payload: getRaw(example.payload),
    });
  }
  if (out.length > 0) return out;

  const item: ExampleMessageItem = { id: 'default', name: 'Example' };
  // without the properties hidden from readers, like in Schema UI
  const options = { skipReadOnly: !received, skipWriteOnly: received };
  if (headers?.schemaFormat === undefined && typeof headers?.schema === 'object')
    item.headers = sample(headers.schema as JsonSchema, options);
  if (payload?.schemaFormat === undefined && typeof payload?.schema === 'object')
    item.payload = sample(payload.schema as JsonSchema, options);
  if (item.headers !== undefined || item.payload !== undefined) out.push(item);

  return out;
}
