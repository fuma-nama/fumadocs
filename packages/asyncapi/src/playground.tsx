'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { type DataEngineListener, type Stf, useStf } from '@fumari/stf';
import { dereference, type JsonSchema, matches } from '@fumadocs/json-schema';
import { EventSourceParserStream } from 'eventsource-parser/stream';
import {
  type OperationMessage,
  useChannelMessages,
  useOperation,
  useOperationSecurity,
} from '@/operation';
import type { SecuritySchemeObject, ServerObject, WsChannelBinding } from '@/types';
import { useRenderContext } from '@/utils/create-page';
import { useServer } from '@/utils/use-server';
import { getUrlParts } from '@/utils/server-url';

export type ConnectionStatus = 'closed' | 'connecting' | 'open';

export interface LogEntry {
  /** unique in the log */
  id: number;
  /** `error` when it can't connect */
  type: 'received' | 'sent' | 'opened' | 'closed' | 'error';
  time: number;
  /** the text of messages, the URL when opened, the reason when closed, the error */
  data?: string;
  /** the data of binary messages */
  binary?: ArrayBuffer;
  /** the close code */
  code?: number;
  /** the documented message it is */
  message?: OperationMessage;
}

// a type alias, form values are records
export type PlaygroundValues = {
  /** parameters of the channel address */
  parameters: Record<string, string>;
  /** the query of connection URL, including API keys */
  query: Record<string, unknown>;
  /** values of the auth inputs, by security scheme id */
  auth: Record<string, string | { username?: string; password?: string }>;
};

export interface Playground {
  /** the form of {@link PlaygroundValues} */
  stf: Stf;
  /** the transport connecting to the selected server, `undefined` when none does */
  transport?: PlaygroundTransport;
  /** the URL to connect with the values of form, `undefined` without a transport */
  url?: string;
  status: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  /** send a message, with the documented message it is. Absent until connected, and when the connection can only receive */
  send?: (data: string | ArrayBuffer, message?: OperationMessage) => void;
  log: LogEntry[];
  clearLog: () => void;
}

export interface PlaygroundTransport {
  /** security schemes it can apply besides API keys in the query, they become inputs of the connection panel */
  auth?: (scheme: SecuritySchemeObject) => boolean;
  connect: (target: ConnectTarget, events: TransportEvents) => TransportConnection;
}

export interface ConnectTarget {
  /** server URL, address and query, for URL-based protocols */
  url: string;
  server: ServerObject;
  /** the channel address with its parameters */
  address: string;
  query: Record<string, unknown>;
  /** values of the auth inputs, for the schemes accepted by `auth` */
  auth: {
    scheme: SecuritySchemeObject;
    /** `{ username, password }` for `userPassword` and HTTP basic */
    value: string | { username: string; password: string };
  }[];
}

/** `close` and `error` end the connection */
export interface TransportEvents {
  open: () => void;
  message: (data: string | ArrayBuffer) => void;
  close: (code?: number, reason?: string) => void;
  error: (message?: string) => void;
}

export interface TransportConnection {
  /** absent when it can only receive, like Server-Sent Events */
  send?: (data: string | ArrayBuffer) => void;
  close: () => void;
}

const wsTransport: PlaygroundTransport = {
  connect({ url }, events) {
    const socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    socket.onopen = events.open;
    socket.onmessage = (event: MessageEvent<string | ArrayBuffer>) => events.message(event.data);
    // errors are followed by closing, browsers don't tell more about them
    socket.onclose = (event) => events.close(event.code, event.reason);

    return {
      send: (data) => socket.send(data),
      close: () => socket.close(1000),
    };
  },
};

/** Server-Sent Events over `fetch`, for `http`/`https`; headers carry API keys and HTTP auth */
export const sseTransport: PlaygroundTransport = {
  auth: (scheme) =>
    scheme.type === 'httpApiKey'
      ? scheme.in === 'header'
      : scheme.type === 'http' && /^(?:basic|bearer)$/i.test(scheme.scheme ?? ''),
  connect({ url, auth }, events) {
    const headers = new Headers({ Accept: 'text/event-stream' });
    for (const { scheme, value } of auth) {
      if (typeof value === 'object')
        headers.set('Authorization', `Basic ${btoa(`${value.username}:${value.password}`)}`);
      else if (scheme.type === 'http') headers.set('Authorization', `Bearer ${value}`);
      else headers.set(scheme.name!, value);
    }

    const controller = new AbortController();
    fetch(url, { headers, signal: controller.signal })
      .then(async (res) => {
        if (!res.ok || !res.body) return events.error(`${res.status} ${res.statusText}`);
        events.open();
        await res.body
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new EventSourceParserStream())
          .pipeTo(new WritableStream({ write: (event) => events.message(event.data) }));
        events.close();
      })
      // it couldn't connect, or the stream broke
      .catch(() => events.close());

    return { close: () => controller.abort() };
  },
};

interface Session {
  open: boolean;
  connection?: TransportConnection;
}

/** older entries are dropped, a busy channel can send many messages */
const maxEntries = 500;
let nextId = 0;

/** an update of the log, adding an entry that happens now */
function addEntry(entry: Omit<LogEntry, 'id' | 'time'>) {
  const item: LogEntry = { ...entry, id: nextId++, time: Date.now() };
  return (log: LogEntry[]) => [...(log.length < maxEntries ? log : log.slice(1)), item];
}

/** the documented message of data, when exactly one payload matches it */
function identifyMessage(data: string, messages: OperationMessage[]): OperationMessage | undefined {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return;
  }

  let found: OperationMessage | undefined;
  for (const item of messages) {
    const payload = item.payload;
    if (
      !payload ||
      payload.schemaFormat !== undefined ||
      !matches(payload.schema as JsonSchema, value)
    )
      continue;
    // loose schemas match many messages, a label would be a guess
    if (found) return;
    found = item;
  }

  return found;
}

/** parameters without values stay as `{name}` */
function fillParameters(address: string, values: Record<string, string>, encode: boolean): string {
  return address.replace(/\{([^}]+)\}/g, (match, name: string) => {
    const value = values[name];
    if (!value) return match;
    return encode ? encodeURIComponent(value) : value;
  });
}

/** the values of the query inputs that the selected server shows */
function pickQuery(values: Record<string, unknown>, names: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of names) if (values[name] !== undefined) out[name] = values[name];
  return out;
}

function getConnectionUrl(
  server: ServerObject,
  variables: Record<string, string>,
  address: string,
  parameters: Record<string, string>,
  query: Record<string, unknown>,
): string {
  // split as the URL is displayed, parameters are filled after
  const [base, path] = getUrlParts(server, variables, address);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    // arrays repeat their key, objects are JSON
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null || item === '') continue;
      search.append(key, typeof item === 'object' ? JSON.stringify(item) : String(item));
    }
  }

  const url = base + fillParameters(path, parameters, true);
  return search.size > 0 ? `${url}?${search}` : url;
}

/**
 * The transport of the selected server's protocol: from `transports`, the page's `playground.transports`, then the built-in one of `ws` and `wss`.
 */
export function usePlaygroundTransport(
  transports?: Record<string, PlaygroundTransport>,
): PlaygroundTransport | undefined {
  const pageTransports = useRenderContext().playground?.transports;
  const { servers, server } = useServer();
  const protocol = server ? servers[server.id]?.protocol : undefined;
  if (!protocol) return;

  return (
    transports?.[protocol] ??
    pageTransports?.[protocol] ??
    (protocol === 'ws' || protocol === 'wss' ? wsTransport : undefined)
  );
}

/**
 * A session on the channel of operation with its {@link usePlaygroundTransport | transport}, under `<OperationProvider />`.
 */
export function usePlayground({
  transports,
}: { transports?: Record<string, PlaygroundTransport> } = {}): Playground {
  const { parameters, channel } = useOperation();
  const channelMessages = useChannelMessages();
  const security = useOperationSecurity();
  const { servers, server } = useServer();
  const schema = server ? servers[server.id] : undefined;
  const transport = usePlaygroundTransport(transports);
  const wsQuery = dereference(
    (dereference(dereference(channel.bindings)?.ws) as WsChannelBinding | undefined)?.query,
  );
  // values typed for other servers stay in the form, out of the URL
  const queryNames = new Set<string>();
  if (
    (schema?.protocol === 'ws' || schema?.protocol === 'wss') &&
    typeof wsQuery === 'object' &&
    wsQuery?.properties
  ) {
    for (const name in wsQuery.properties) queryNames.add(name);
  }
  for (const { scheme } of [...security.server, ...security.operation]) {
    if (scheme.type === 'httpApiKey' && scheme.in === 'query' && scheme.name)
      queryNames.add(scheme.name);
  }
  const stf = useStf({
    defaultValues: (): PlaygroundValues => {
      const out: PlaygroundValues = { parameters: {}, query: {}, auth: {} };
      for (const { name, parameter } of parameters) {
        const value = parameter.default ?? parameter.examples?.[0] ?? parameter.enum?.[0];
        if (value !== undefined) out.parameters[name] = value;
      }

      // required values of the query start from their defaults
      if (typeof wsQuery === 'object' && wsQuery?.properties) {
        for (const name of wsQuery.required ?? []) {
          const property = dereference(wsQuery.properties[name]);
          const value: unknown = typeof property === 'object' ? property?.default : undefined;
          if (value === undefined) continue;
          // a copy without the magic proxy
          out.query[name] = typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
        }
      }

      return out;
    },
  });
  const engine = stf.dataEngine;
  const [status, setStatus] = useState<ConnectionStatus>('closed');
  const [canSend, setCanSend] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const sessionRef = useRef<Session | null>(null);
  const subscribe = useCallback(
    (onChange: () => void) => {
      const listener: DataEngineListener = { onUpdate: onChange };
      engine.listen(listener);
      return () => engine.unlisten(listener);
    },
    [engine],
  );
  const getUrl = () => {
    if (!schema || !transport) return;
    const values = engine.getData() as PlaygroundValues;

    return getConnectionUrl(
      schema,
      server!.variables,
      channel.address ?? '',
      values.parameters,
      pickQuery(values.query, queryNames),
    );
  };
  const url = useSyncExternalStore(subscribe, getUrl, getUrl);

  // stable, so memoized UI skips the renders of arriving messages
  const disconnect = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    // the session ends now, events of the closing connection are ignored
    sessionRef.current = null;
    setStatus('closed');
    if (session.open) setLog(addEntry({ type: 'closed' }));
    session.connection?.close();
  }, []);

  const send = useCallback((data: string | ArrayBuffer, message?: OperationMessage) => {
    const session = sessionRef.current;
    if (!session?.open || !session.connection?.send) return;
    session.connection.send(data);
    setLog(
      addEntry(
        typeof data === 'string'
          ? { type: 'sent', data, message }
          : { type: 'sent', binary: data, message },
      ),
    );
  }, []);

  // a session belongs to its URL, it ends when the URL changes and with the page
  useEffect(() => disconnect, [disconnect, url]);

  return {
    stf,
    transport,
    url,
    status,
    connect() {
      if (!schema || !transport || !url || sessionRef.current) return;
      const values = engine.getData() as PlaygroundValues;
      const auth: ConnectTarget['auth'] = [];
      const added = new Set<string>();
      for (const { id, scheme } of [...security.server, ...security.operation]) {
        const value = values.auth[id];
        // the server and operation can share schemes
        if (!value || added.has(id) || !transport.auth?.(scheme)) continue;
        added.add(id);
        auth.push({
          scheme,
          value: typeof value === 'string' ? value : { username: '', password: '', ...value },
        });
      }

      const session: Session = { open: false };
      function end(entry: Omit<LogEntry, 'id' | 'time'>) {
        if (sessionRef.current !== session) return;
        sessionRef.current = null;
        setStatus('closed');
        setLog(addEntry(entry));
      }

      sessionRef.current = session;
      setStatus('connecting');
      try {
        session.connection = transport.connect(
          {
            url,
            server: schema,
            address: fillParameters(channel.address ?? '', values.parameters, false),
            query: pickQuery(values.query, queryNames),
            auth,
          },
          {
            open() {
              if (sessionRef.current !== session) return;
              session.open = true;
              setStatus('open');
              setLog(addEntry({ type: 'opened', data: url }));
            },
            message(data) {
              if (sessionRef.current !== session) return;
              setLog(
                addEntry(
                  typeof data === 'string'
                    ? {
                        type: 'received',
                        data,
                        message: identifyMessage(data, channelMessages.incoming),
                      }
                    : { type: 'received', binary: data },
                ),
              );
            },
            // closing before it opens is failing to connect
            close: (code, reason) =>
              end(session.open ? { type: 'closed', code, data: reason } : { type: 'error', code }),
            error(message) {
              end({ type: 'error', data: message });
              session.connection?.close();
            },
          },
        );
        // transports can end it before returning the connection
        if (sessionRef.current === session) setCanSend(session.connection.send !== undefined);
        else session.connection.close();
      } catch (e) {
        end({ type: 'error', data: e instanceof Error ? e.message : String(e) });
      }
    },
    disconnect,
    send: status === 'open' && canSend ? send : undefined,
    log,
    clearLog() {
      setLog([]);
    },
  };
}
