'use client';
import { createContext, type ReactNode, use, useMemo } from 'react';
import type {
  AsyncAPISchemaObject,
  ChannelObject,
  MessageObject,
  OperationObject,
  OperationReplyAddressObject,
  ParameterObject,
  SecuritySchemeObject,
  ServerObject,
} from '@/types';
import {
  getMessageDisplayName,
  getOperationDisplayName,
  getOperationMessages,
  resolveMultiFormatSchema,
} from '@/utils/schema';
import type { JsonSchema } from '@fumadocs/json-schema';
import { applyMessageTraits, applyOperationTraits } from '@/utils/traits';
import { type ExampleMessageItem, getExampleMessages } from '@/utils/get-example-messages';
import { type PageOperationProps, useAsyncAPI } from '@/headless/runtime';
import { ServerProvider, useServer } from '@/headless/server';

export interface OperationParameter {
  name: string;
  parameter: ParameterObject;
  /** the schema rendered by Schema UI */
  schema: JsonSchema;
}

export interface OperationMessage {
  /** id for anchors and accordion values */
  id: string;
  /** display name */
  name: string;
  /** resolved, with traits applied */
  message: MessageObject;
  headers?: AsyncAPISchemaObject;
  payload?: AsyncAPISchemaObject;
  /** example messages */
  examples: ExampleMessageItem[];
}

export interface OperationReply {
  address?: OperationReplyAddressObject;
  messages: { title: string; payload?: AsyncAPISchemaObject }[];
}

/** the operation and its resolved details, all read-only */
export interface OperationInfo {
  id: string;
  action: 'send' | 'receive';
  /** resolved, with traits applied */
  operation: OperationObject;
  channel: ChannelObject;
  title: string;
  description?: string;
  parameters: OperationParameter[];
  messages: OperationMessage[];
  reply?: OperationReply;
}

export interface OperationProviderProps extends Pick<PageOperationProps, 'id' | 'action'> {
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

export function OperationProvider({ id, action, children }: OperationProviderProps) {
  const runtime = useAsyncAPI();
  const info = useMemo<OperationInfo>(() => {
    const { dereferenced, resolve } = runtime.doc;
    const found = resolve(dereferenced.operations?.[id]);
    if (!found) throw new Error(`[Fumadocs AsyncAPI] Operation not found in schema: ${id}`);

    const operation = applyOperationTraits(found, resolve);
    const channel = resolve(operation.channel);

    const parameters: OperationParameter[] = [];
    for (const [name, item] of Object.entries(channel.parameters ?? {})) {
      const parameter = resolve(item);

      parameters.push({
        name,
        parameter,
        schema: {
          type: 'string',
          description: parameter.description,
          enum: parameter.enum,
          default: parameter.default,
        },
      });
    }

    const items = getOperationMessages(operation, resolve);
    const messages: OperationMessage[] = [];
    for (let i = 0; i < items.length; i++) {
      const message = applyMessageTraits(resolve(items[i]), resolve);
      const item = {
        id: message.name ?? `message-${i}`,
        name: getMessageDisplayName(items[i], message, i),
        message,
      } as OperationMessage;

      // a UI renders message details on demand, e.g. in an accordion
      lazy(item, 'headers', () => resolveMultiFormatSchema(resolve(message.headers)));
      lazy(item, 'payload', () => resolveMultiFormatSchema(resolve(message.payload)));
      lazy(item, 'examples', () =>
        getExampleMessages({ message }).filter(
          (example) =>
            example.payload !== undefined || example.headers !== undefined || example.description,
        ),
      );
      messages.push(item);
    }

    let reply: OperationReply | undefined;
    if (operation.reply) {
      const resolved = resolve(operation.reply);
      const messages: OperationReply['messages'] = [];

      for (let i = 0; i < (resolved.messages?.length ?? 0); i++) {
        const message = resolve(resolved.messages![i]);

        messages.push({
          title: message.title || message.name || `Reply ${i + 1}`,
          payload: resolveMultiFormatSchema(resolve(message.payload)),
        });
      }

      reply = { address: resolve(resolved.address), messages };
    }

    return {
      id,
      action,
      operation,
      channel,
      title: getOperationDisplayName(id, operation),
      description: operation.description,
      parameters,
      messages,
      reply,
    };
  }, [runtime, id, action]);

  const servers = useMemo(() => {
    const { servers } = info.channel;
    if (!servers) return;
    const { dereferenced, resolve } = runtime.doc;

    // `servers` of channels are Reference Objects, resolved values are referentially
    // stable in the magic proxy, we can match them against `servers` of document
    const selected = new Set<ServerObject>();
    for (const server of servers) selected.add(resolve(server));

    const out: Record<string, ServerObject> = {};
    for (const [k, v] of Object.entries(dereferenced.servers ?? {})) {
      const server = resolve(v);
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

/**
 * Resolved security schemes of the operation, falling back to the selected server's.
 */
export function useOperationSecurity(): SecuritySchemeObject[] {
  const { operation } = useOperation();
  const { resolve } = useAsyncAPI().doc;
  const { server, servers } = useServer();

  return useMemo(() => {
    const schemes = operation.security ?? (server ? servers[server.id]?.security : undefined);
    const out: SecuritySchemeObject[] = [];
    for (const scheme of schemes ?? []) out.push(resolve(scheme));

    return out;
  }, [operation, resolve, server, servers]);
}
