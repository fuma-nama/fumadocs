import type {
  AsyncAPISchemaObject,
  ChannelObject,
  MessageObject,
  MultiFormatSchemaObject,
  OperationObject,
  ReferenceObject,
  TagObject,
} from '@/types';
import { dereference } from '@fumadocs/json-schema';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import { idToTitle } from 'shared-api/utils/id-to-title';

export function getTagDisplayName(tag: TagObject): string {
  if ('x-displayName' in tag && typeof tag['x-displayName'] === 'string')
    return tag['x-displayName'];

  return idToTitle(tag.name);
}

export function getOperationDisplayName(id: string, operation: OperationObject): string {
  return operation.title || operation.summary || idToTitle(id);
}

export interface MessageEntry {
  /** the key of message in its channel */
  key: string;
  value: MessageObject | ReferenceObject;
}

/**
 * The messages of an operation, all messages of its channel when it doesn't list them.
 */
export function getOperationMessages(
  messages: (MessageObject | ReferenceObject)[] | undefined,
  channel: ChannelObject | undefined,
): MessageEntry[] {
  const out: MessageEntry[] = [];

  if (messages) {
    for (let i = 0; i < messages.length; i++) {
      const value = messages[i];
      // messages are referenced from the channel, like `#/channels/root/messages/hello`
      const key = '$ref' in value ? value.$ref.slice(value.$ref.lastIndexOf('/') + 1) : String(i);
      out.push({ key: decodePointer(key), value });
    }
  } else if (channel?.messages) {
    for (const key in channel.messages) out.push({ key, value: channel.messages[key] });
  }

  return out;
}

function decodePointer(segment: string): string {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

export function getMessageDisplayName(key: string, message: MessageObject): string {
  return message.title || message.name || key;
}

export type MessageSchema =
  | { schema: AsyncAPISchemaObject; schemaFormat?: undefined }
  | {
      /** the schema as it is, like an Avro record or a Protobuf definition */
      schema: unknown;
      schemaFormat: string;
    };

/** formats rendered with Schema UI: AsyncAPI, JSON Schema and OpenAPI schemas */
const jsonSchemaFormat =
  /^application\/(?:vnd\.aai\.asyncapi|schema|vnd\.oai\.openapi)(?:\+json|\+yaml)?(?:;|$)/;

export function resolveMultiFormatSchema(
  value: MultiFormatSchemaObject | ReferenceObject | undefined,
): MessageSchema | undefined {
  const resolved = dereference(value);
  if (resolved == null) return;
  if (typeof resolved !== 'object' || !('schemaFormat' in resolved)) {
    return { schema: resolved as AsyncAPISchemaObject };
  }

  const { schema, schemaFormat } = resolved;
  if (!schemaFormat || jsonSchemaFormat.test(schemaFormat)) {
    return { schema: dereference(schema) as AsyncAPISchemaObject };
  }

  // shown as it is, without the magic proxy
  return { schema: getRaw(dereference(schema)), schemaFormat };
}
