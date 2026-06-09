import type {
  AsyncAPISchemaObject,
  MessageExampleObject,
  MessageObject,
  MultiFormatSchemaObject,
  OperationObject,
  RenderContext,
  TagObject,
} from '@/types';
import type { NoReference } from '@fumadocs/api-docs/schema';
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

export function getMessageDisplayName(
  message: NoReference<MessageObject>,
  ctx: RenderContext,
  idx?: number,
) {
  let v = message.title || message.name;
  if (v) return v;

  v = ctx.schema.getRawRef(message)?.split('/').at(-1);
  if (v) return v;

  return typeof idx === 'number' ? `Unknown Message ${idx + 1}` : 'Unknown Message';
}

export function getOperationDisplayName(
  id: string,
  operation: OperationObject | NoReference<OperationObject>,
): string {
  return operation.title || operation.summary || idToTitle(id);
}

export function getOperationMessages(
  operation: NoReference<OperationObject>,
): NoReference<MessageObject>[] {
  if (operation.messages) return operation.messages;

  const out: NoReference<MessageObject>[] = [];
  if (operation.channel.messages) {
    for (const [id, message] of Object.entries(operation.channel.messages)) {
      message.name ??= id;
      out.push(message);
    }
  }
  return out;
}

export function resolveMultiFormatSchema(
  schema?: NoReference<MultiFormatSchemaObject>,
): NoReference<AsyncAPISchemaObject> | undefined {
  if (!schema) return;
  if (typeof schema === 'object' && schema !== null && 'schema' in schema) {
    return schema.schema;
  }
  return schema;
}
