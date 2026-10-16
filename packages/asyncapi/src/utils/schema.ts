import type {
  AsyncAPIObject,
  AsyncAPISchemaObject,
  ChannelObject,
  MessageObject,
  MultiFormatSchemaObject,
  OperationObject,
  OperationReplyAddressObject,
  ParameterObject,
  ReferenceObject,
  SecuritySchemeObject,
  ServerObject,
  TagObject,
} from '@/types';
import { dereference, type JsonSchema } from '@fumadocs/json-schema';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import { idToTitle } from 'shared-api/utils/id-to-title';
import { applyTraits } from './traits';
import { type ExampleMessageItem, getExampleMessages } from './get-example-messages';

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

export interface SecurityRequirement {
  /** the key in `components.securitySchemes`, or the type of an inline scheme */
  id: string;
  scheme: SecuritySchemeObject;
}

export type MessageSchema =
  | { schema: AsyncAPISchemaObject; schemaFormat?: undefined }
  | {
      /** the schema as it is, like an Avro record or a Protobuf definition */
      schema: unknown;
      schemaFormat: string;
    };

export function getTagDisplayName(tag: TagObject): string {
  const name = tag['x-displayName'];
  return typeof name === 'string' ? name : idToTitle(tag.name);
}

export function getOperationDisplayName(id: string, operation: OperationObject): string {
  return operation.title || operation.summary || idToTitle(id);
}

/** the operation with its traits applied */
export function getOperation(doc: AsyncAPIObject, id: string): OperationObject | undefined {
  const operation = dereference(doc.operations?.[id]);
  if (operation) return applyTraits(operation);
}

/** the key that a `$ref` points to in its parent, like `planetId` of `#/components/parameters/planetId` */
export function getRefKey(ref: string): string {
  return ref.slice(ref.lastIndexOf('/') + 1);
}

/**
 * Resolve an operation of the document for pages: traits are applied, its channel, parameters, messages and reply are resolved.
 */
export function resolveOperation(doc: AsyncAPIObject, id: string): OperationInfo | undefined {
  const operation = getOperation(doc, id);
  if (!operation) return;
  const channel = dereference(operation.channel);
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
    messages: getMessages(
      operation.messages,
      channel,
      doc.defaultContentType,
      operation.action === 'send',
    ),
    reply: getReply(operation, doc.defaultContentType),
  };
}

/** define `key` as a property computed on first access */
export function lazy<T extends object, K extends keyof T>(obj: T, key: K, get: () => T[K]): void {
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

/** the messages of an operation, all messages of its channel when it doesn't list them */
function getMessages(
  messages: (MessageObject | ReferenceObject)[] | undefined,
  channel: ChannelObject | undefined,
  defaultContentType: string | undefined,
  received: boolean,
): OperationMessage[] {
  const out: OperationMessage[] = [];

  function add(id: string, value: MessageObject | ReferenceObject) {
    const message = applyTraits(dereference(value));
    const item = {
      id,
      name: message.title || message.name || id,
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

  if (messages) {
    for (let i = 0; i < messages.length; i++) {
      const value = messages[i];
      // messages are referenced from the channel, like `#/channels/root/messages/hello`
      add('$ref' in value ? decodePointer(getRefKey(value.$ref)) : String(i), value);
    }
  } else if (channel?.messages) {
    for (const key in channel.messages) add(key, channel.messages[key]);
  }

  return out;
}

function decodePointer(segment: string): string {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

function getReply(
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
    messages: getMessages(
      messages,
      replyChannel,
      defaultContentType,
      operation.action === 'receive',
    ),
  };
}

/** messages going one way on the channel of operation, the messages of operation come first */
export function getChannelMessages(
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
      add(getMessages(operation.messages, info.channel, defaultContentType, incoming));
    else addReply(getReply(operation, defaultContentType));
  }

  return out;
}

/** the servers of a channel by id, all servers of the document when it doesn't list them */
export function getServers(
  doc: AsyncAPIObject,
  channel?: ChannelObject,
): Record<string, ServerObject> {
  // `servers` of channels are Reference Objects, resolved values are referentially stable in the magic proxy
  let selected: Set<ServerObject> | undefined;
  if (channel?.servers && channel.servers.length > 0) {
    selected = new Set();
    for (const server of channel.servers) selected.add(dereference(server));
  }

  const out: Record<string, ServerObject> = {};
  for (const [id, value] of Object.entries(doc.servers ?? {})) {
    const server = dereference(value);
    if (!selected || selected.has(server)) out[id] = server;
  }

  return out;
}

export function toRequirements(
  schemes: (SecuritySchemeObject | ReferenceObject)[] | undefined,
): SecurityRequirement[] {
  const out: SecurityRequirement[] = [];
  for (const item of schemes ?? []) {
    const scheme = dereference(item);
    out.push({ id: '$ref' in item ? getRefKey(item.$ref) : scheme.type, scheme });
  }

  return out;
}

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
