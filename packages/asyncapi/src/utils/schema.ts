import type {
  AsyncAPISchemaObject,
  MessageObject,
  MultiFormatSchemaObject,
  OperationObject,
  ReferenceObject,
  TagObject,
} from '@/types';
import type { DereferencedDocument } from '@/utils/document/dereference';
import { idToTitle } from 'shared-api/utils/id-to-title';

export function getTagDisplayName(tag: TagObject): string {
  if ('x-displayName' in tag && typeof tag['x-displayName'] === 'string')
    return tag['x-displayName'];

  return idToTitle(tag.name);
}

export function getMessageDisplayName(
  message: MessageObject | ReferenceObject,
  resolved: MessageObject,
  idx?: number,
): string {
  let v = resolved.title || resolved.name;
  if (v) return v;

  // derive the name from the `$ref` of Reference Objects (e.g. `#/components/messages/MyMessage`)
  if ('$ref' in message && typeof message.$ref === 'string') {
    v = message.$ref.split('/').at(-1);
    if (v) return v;
  }

  return typeof idx === 'number' ? `Unknown Message ${idx + 1}` : 'Unknown Message';
}

export function getOperationDisplayName(id: string, operation: OperationObject): string {
  return operation.title || operation.summary || idToTitle(id);
}

export function getOperationMessages(
  operation: OperationObject,
  resolve: DereferencedDocument['resolve'],
): (MessageObject | ReferenceObject)[] {
  if (operation.messages) return operation.messages;

  const out: (MessageObject | ReferenceObject)[] = [];
  const channel = resolve(operation.channel);
  if (channel.messages) {
    for (const [id, message] of Object.entries(channel.messages)) {
      resolve(message).name ??= id;
      out.push(message);
    }
  }
  return out;
}

export function resolveMultiFormatSchema(
  schema?: MultiFormatSchemaObject,
): AsyncAPISchemaObject | undefined {
  if (!schema) return;
  if (typeof schema === 'object' && schema !== null && 'schema' in schema) {
    return schema.schema;
  }
  return schema;
}
