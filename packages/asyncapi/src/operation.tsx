'use client';
import { createContext, type ReactNode, use, useMemo } from 'react';
import type {
  AsyncAPIObject,
  ChannelObject,
  MessageObject,
  OperationObject,
  OperationReplyAddressObject,
  ParameterObject,
  ReferenceObject,
  SecuritySchemeObject,
  ServerObject,
} from '@/types';
import {
  getMessageDisplayName,
  getOperationDisplayName,
  getOperationMessages,
  type MessageEntry,
  type MessageSchema,
  resolveMultiFormatSchema,
} from '@/utils/schema';
import { dereference, type JsonSchema } from '@fumadocs/json-schema';
import { applyMessageTraits, applyOperationTraits } from '@/utils/traits';
import { type ExampleMessageItem, getExampleMessages } from '@/utils/get-example-messages';
import { useAsyncAPI } from '@/utils/create-page';
import { ServerProvider, useServer } from '@/utils/use-server';

export type { MessageSchema };

export interface OperationParameter {
  name: string;
  parameter: ParameterObject;
  /** the schema rendered by Schema UI */
  schema: JsonSchema;
}

export interface OperationMessage {
  /** the key of message in its channel, unique in the operation */
  id: string;
  /** display name */
  name: string;
  /** resolved, with traits applied */
  message: MessageObject;
  /** falls back to the `defaultContentType` of document */
  contentType?: string;
  /** sent by the application to readers, otherwise readers send it */
  received: boolean;
  headers?: MessageSchema;
  payload?: MessageSchema;
  /** example messages, generated from its schemas when it has none */
  examples: ExampleMessageItem[];
}

export interface OperationReply {
  /** where the reply is sent, a runtime expression like `$message.header#/replyTo` */
  address?: OperationReplyAddressObject;
  /** the channel of reply, its address is unknown when `address` is set */
  channel?: ChannelObject;
  messages: OperationMessage[];
}

/** the operation and its resolved details, all read-only */
export interface OperationInfo {
  id: string;
  /** the action of the application described by the document, readers do the opposite */
  action: 'send' | 'receive';
  /** resolved, with traits applied */
  operation: OperationObject;
  channel: ChannelObject;
  title: string;
  description?: string;
  /** parameters of the channel address */
  parameters: OperationParameter[];
  messages: OperationMessage[];
  reply?: OperationReply;
}

/** props of the component rendering an operation of a page */
export interface PageOperationProps {
  id: string;
  showTitle?: boolean;
  showDescription?: boolean;
  /** the anchor of operation when titles are shown, unique in the page */
  anchor?: string;
}

export interface OperationProviderProps extends Pick<PageOperationProps, 'id'> {
  children: ReactNode;
}

const OperationContext = createContext<OperationInfo | null>(null);

/** define `key` as a property computed on first access */
function lazy<T extends object, K extends keyof T>(obj: T, key: K, get: () => T[K]): void {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: true,
    get() {
      const value = get();
      Object.defineProperty(obj, key, { value, enumerable: true, configurable: true });

      return value;
    },
  });
}

function toOperationMessages(
  entries: MessageEntry[],
  defaultContentType: string | undefined,
  received: boolean,
): OperationMessage[] {
  const out: OperationMessage[] = [];

  for (const { key, value } of entries) {
    const message = applyMessageTraits(dereference(value));
    const item = {
      id: key,
      name: getMessageDisplayName(key, message),
      message,
      contentType: message.contentType ?? defaultContentType,
      received,
    } as OperationMessage;

    // a UI renders message details on demand
    lazy(item, 'headers', () => resolveMultiFormatSchema(message.headers));
    lazy(item, 'payload', () => resolveMultiFormatSchema(message.payload));
    lazy(item, 'examples', () => getExampleMessages(message, item));
    out.push(item);
  }

  return out;
}

function toReply(
  operation: OperationObject,
  defaultContentType: string | undefined,
): OperationReply | undefined {
  if (!operation.reply) return;
  const { address, channel, messages } = dereference(operation.reply);
  const replyChannel = dereference(channel);

  return {
    address: dereference(address),
    channel: replyChannel,
    // replies go the other way
    messages: toOperationMessages(
      getOperationMessages(messages, replyChannel),
      defaultContentType,
      operation.action === 'receive',
    ),
  };
}

export function OperationProvider({ id, children }: OperationProviderProps) {
  const runtime = useAsyncAPI();
  const info = useMemo<OperationInfo>(() => {
    const { dereferenced } = runtime.doc;
    const found = dereference(dereferenced.operations?.[id]);
    if (!found) throw new Error(`[Fumadocs AsyncAPI] Operation not found in schema: ${id}`);

    const operation = applyOperationTraits(found);
    const channel = dereference(operation.channel);
    const { defaultContentType } = dereferenced;

    const parameters: OperationParameter[] = [];
    for (const [name, item] of Object.entries(channel.parameters ?? {})) {
      const parameter = dereference(item);

      parameters.push({
        name,
        parameter,
        schema: {
          type: 'string',
          description: parameter.description,
          enum: parameter.enum,
          default: parameter.default,
          examples: parameter.examples,
        },
      });
    }

    return {
      id,
      action: operation.action,
      operation,
      channel,
      title: getOperationDisplayName(id, operation),
      description: operation.description,
      parameters,
      messages: toOperationMessages(
        getOperationMessages(operation.messages, channel),
        defaultContentType,
        operation.action === 'send',
      ),
      reply: toReply(operation, defaultContentType),
    };
  }, [runtime, id]);

  const servers = useMemo(() => {
    const { servers } = info.channel;
    // absent or empty: available on all servers
    if (!servers || servers.length === 0) return;
    // `servers` of channels are Reference Objects, resolved values are referentially
    // stable in the magic proxy, we can match them against `servers` of document
    const selected = new Set<ServerObject>();
    for (const server of servers) selected.add(dereference(server));

    const out: Record<string, ServerObject> = {};
    for (const [k, v] of Object.entries(runtime.doc.dereferenced.servers ?? {})) {
      const server = dereference(v);
      if (selected.has(server)) out[k] = server;
    }

    return out;
  }, [info, runtime]);

  const content = <OperationContext value={info}>{children}</OperationContext>;
  if (!servers) return content;

  return (
    <ServerProvider servers={servers} storageKeyPrefix={runtime.storageKeyPrefix}>
      {content}
    </ServerProvider>
  );
}

export function useOperation(): OperationInfo {
  const ctx = use(OperationContext);
  if (!ctx) throw new Error('Component must be used under <OperationProvider />');

  return ctx;
}

export interface ChannelMessages {
  /** sent by the application, received by readers */
  incoming: OperationMessage[];
  /** received by the application, sent by readers */
  outgoing: OperationMessage[];
}

/** messages going one way on the channel of operation, the messages of operation come first */
function getChannelMessages(
  { operations, defaultContentType }: AsyncAPIObject,
  info: OperationInfo,
  incoming: boolean,
): OperationMessage[] {
  const out: OperationMessage[] = [];
  const seen = new Set<string>();

  function add(items: OperationMessage[]) {
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }

  function addReply(reply: OperationReply | undefined) {
    // on the same connection when they have no channel of their own
    if (reply && (!reply.channel || reply.channel === info.channel)) add(reply.messages);
  }

  // readers receive what the application sends, replies go the other way
  if ((info.action === 'send') === incoming) add(info.messages);
  else addReply(info.reply);

  for (const [id, item] of Object.entries(operations ?? {})) {
    if (id === info.id) continue;
    const operation = dereference(item);
    // resolved values are referentially stable in the magic proxy
    if (dereference(operation.channel) !== info.channel) continue;

    if ((operation.action === 'send') === incoming)
      add(
        toOperationMessages(
          getOperationMessages(operation.messages, info.channel),
          defaultContentType,
          incoming,
        ),
      );
    else addReply(toReply(operation, defaultContentType));
  }

  return out;
}

/**
 * Messages of all operations on the channel of operation, including replies on the channel. The messages of operation come first.
 */
export function useChannelMessages(): ChannelMessages {
  const { doc } = useAsyncAPI();
  const info = useOperation();

  return useMemo(() => {
    const out = {} as ChannelMessages;
    // computed on first access, pages can have many operations on the same channel
    lazy(out, 'incoming', () => getChannelMessages(doc.dereferenced, info, true));
    lazy(out, 'outgoing', () => getChannelMessages(doc.dereferenced, info, false));

    return out;
  }, [doc, info]);
}

export interface SecurityRequirement {
  /** the key in `components.securitySchemes`, or the type of an inline scheme */
  id: string;
  scheme: SecuritySchemeObject;
}

export interface OperationSecurity {
  /** to connect to the selected server, one of them is required */
  server: SecurityRequirement[];
  /** to perform the operation, one of them is required besides the server's */
  operation: SecurityRequirement[];
}

function toRequirements(
  schemes: (SecuritySchemeObject | ReferenceObject)[] | undefined,
): SecurityRequirement[] {
  const out: SecurityRequirement[] = [];
  for (const item of schemes ?? []) {
    const scheme = dereference(item);
    const id = '$ref' in item ? item.$ref.slice(item.$ref.lastIndexOf('/') + 1) : scheme.type;
    out.push({ id, scheme });
  }

  return out;
}

/**
 * The security requirements of the selected server and the operation, both must be satisfied.
 */
export function useOperationSecurity(): OperationSecurity {
  const { operation } = useOperation();
  const { server, servers } = useServer();
  const serverSchemes = server ? servers[server.id]?.security : undefined;

  return useMemo(
    () => ({
      server: toRequirements(serverSchemes),
      operation: toRequirements(operation.security),
    }),
    [operation, serverSchemes],
  );
}
