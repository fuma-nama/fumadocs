import type {
  AsyncAPIObject,
  AsyncAPISchemaObject,
  ChannelObject,
  MessageObject,
  MultiFormatSchemaObject,
  OperationObject,
  OperationReplyObject,
  ServerObject,
  TagObject,
} from '@/types';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { idToTitle } from '@fumadocs/api-docs/utils/id-to-title';

interface ResolvedOperation {
  id: string;
  operation: NoReference<OperationObject>;
  channel: NoReference<ChannelObject>;
  messages: NoReference<MessageObject>[];
  reply?: NoReference<OperationReplyObject>;
}

export function resolveSchema(schema?: MultiFormatSchemaObject): AsyncAPISchemaObject | undefined {
  if (!schema) return;
  if (typeof schema === 'object' && schema !== null && 'schema' in schema) {
    return schema.schema;
  }
  return schema;
}

export function getChannelAddress(channel: NoReference<ChannelObject>): string | undefined {
  if (channel.address === null) return;
  return channel.address ?? undefined;
}

export function resolveServerUrl(
  server: NoReference<ServerObject>,
  variables: Record<string, string> = {},
): string {
  let host = server.host;
  let pathname = server.pathname ?? '';

  for (const [key, value] of Object.entries(variables)) {
    const token = `{${key}}`;
    host = host.replaceAll(token, value);
    pathname = pathname.replaceAll(token, value);
  }

  if (pathname && !pathname.startsWith('/')) pathname = `/${pathname}`;
  return `${server.protocol}://${host}${pathname}`;
}

export function resolveOperation(id: string, doc: AsyncAPIObject): ResolvedOperation | undefined {
  const operation = dereferenceShallow(doc.operations?.[id], doc);
  if (!operation) return;

  const channel = dereferenceShallow(operation.channel, doc);
  if (!channel) return;

  const messages = getOperationMessages(
    operation as NoReference<OperationObject>,
    channel as NoReference<ChannelObject>,
    doc,
  );
  const reply = operation.reply
    ? (dereferenceShallow(operation.reply, doc) as NoReference<OperationReplyObject>)
    : undefined;

  return {
    id,
    operation: operation as NoReference<OperationObject>,
    channel: channel as NoReference<ChannelObject>,
    messages,
    reply,
  };
}

export function getOperationMessages(
  operation: NoReference<OperationObject>,
  channel: NoReference<ChannelObject>,
  doc: AsyncAPIObject,
): NoReference<MessageObject>[] {
  if (operation.messages && operation.messages.length > 0) {
    return operation.messages
      .map((message) => dereferenceShallow(message, doc))
      .filter(Boolean) as NoReference<MessageObject>[];
  }

  if (!channel.messages) return [];

  const messages: NoReference<MessageObject>[] = [];
  for (const [name, message] of Object.entries(channel.messages)) {
    const resolved = dereferenceShallow(message, doc);
    if (!resolved) continue;
    messages.push({
      ...resolved,
      name: resolved.name ?? name,
    });
  }

  return messages;
}

export function getOperationDisplayName(
  id: string,
  operation: NoReference<OperationObject>,
  channel: NoReference<ChannelObject>,
): string {
  return operation.title || operation.summary || channel.title || channel.summary || idToTitle(id);
}

export function collectDocumentTags(doc: AsyncAPIObject): NoReference<TagObject>[] {
  const tags = new Map<string, NoReference<TagObject>>();

  for (const tag of doc.info.tags ?? []) {
    const resolved = dereferenceShallow(tag, doc) as NoReference<TagObject> | undefined;
    if (resolved?.name) tags.set(resolved.name, resolved);
  }

  for (const operation of Object.values(doc.operations ?? {})) {
    const resolved = dereferenceShallow(operation, doc);
    for (const tag of resolved?.tags ?? []) {
      const resolvedTag = dereferenceShallow(tag, doc) as NoReference<TagObject> | undefined;
      if (resolvedTag?.name) tags.set(resolvedTag.name, resolvedTag);
    }
  }

  return [...tags.values()];
}

export function getOperationTags(operation: OperationObject, doc: AsyncAPIObject): string[] {
  return (operation.tags ?? [])
    .map((tag) => (dereferenceShallow(tag, doc) as { name?: string } | undefined)?.name)
    .filter((name): name is string => Boolean(name));
}
