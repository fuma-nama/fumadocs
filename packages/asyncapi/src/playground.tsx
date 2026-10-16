'use client';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { type DataEngineListener, type Stf, useStf } from '@fumari/stf';
import { dereference, type JsonSchema, matches } from '@fumadocs/json-schema';
import { type OperationMessage, useChannelMessages, useOperation } from '@/operation';
import type { ServerObject, WsChannelBinding } from '@/types';
import { useServer } from '@/utils/use-server';
import { fillVariables, getUrlParts } from '@/utils/server-url';

export type ConnectionStatus = 'closed' | 'connecting' | 'open';

export interface LogEntry {
  /** unique in the log */
  id: number;
  /** `error` when it can't connect */
  type: 'received' | 'sent' | 'opened' | 'closed' | 'error';
  time: number;
  /** the text of messages, the URL when opened, the reason when closed, the error */
  data?: string;
  /** the size of binary messages in bytes */
  bytes?: number;
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
};

export interface Playground {
  /** the form of {@link PlaygroundValues} */
  stf: Stf;
  /** the URL to connect with the values of form, `undefined` when the selected server isn't a WebSocket server */
  url?: string;
  status: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  /** send a message, with the documented message it is */
  send: (data: string, message?: OperationMessage) => void;
  log: LogEntry[];
  clearLog: () => void;
}

/** older entries are dropped, a busy channel can send many messages */
const maxEntries = 500;

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

function getConnectionUrl(
  server: ServerObject | undefined,
  variables: Record<string, string>,
  address: string,
  values: PlaygroundValues,
): string | undefined {
  if (server?.protocol !== 'ws' && server?.protocol !== 'wss') return;
  // split as the URL is displayed, parameters are filled after
  const [base, path] = getUrlParts(server, variables, address);
  const parameters: Record<string, string> = {};
  for (const [key, value] of Object.entries(values.parameters))
    if (value) parameters[key] = encodeURIComponent(value);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values.query)) {
    // arrays repeat their key, objects are JSON
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null || item === '') continue;
      query.append(key, typeof item === 'object' ? JSON.stringify(item) : String(item));
    }
  }

  const url = base + fillVariables(path, parameters);
  return query.size > 0 ? `${url}?${query}` : url;
}

/**
 * A WebSocket session of the channel of operation, under `<OperationProvider />`.
 */
export function usePlayground(): Playground {
  const { parameters, channel } = useOperation();
  const channelMessages = useChannelMessages();
  const { servers, server } = useServer();
  const stf = useStf({
    defaultValues: (): PlaygroundValues => {
      const out: PlaygroundValues = { parameters: {}, query: {} };
      for (const { name, parameter } of parameters) {
        const value = parameter.default ?? parameter.examples?.[0] ?? parameter.enum?.[0];
        if (value !== undefined) out.parameters[name] = value;
      }

      // required values of the query start from their defaults
      const binding = dereference(dereference(channel.bindings)?.ws) as
        | WsChannelBinding
        | undefined;
      const query = dereference(binding?.query);
      if (typeof query === 'object' && query?.properties) {
        for (const name of query.required ?? []) {
          const property = dereference(query.properties[name]);
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
  const [log, setLog] = useState<LogEntry[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const nextId = useRef(0);
  const subscribe = useCallback(
    (onChange: () => void) => {
      const listener: DataEngineListener = { onUpdate: onChange };
      engine.listen(listener);
      return () => engine.unlisten(listener);
    },
    [engine],
  );
  const getUrl = () =>
    server
      ? getConnectionUrl(
          servers[server.id],
          server.variables,
          channel.address ?? '',
          engine.getData() as PlaygroundValues,
        )
      : undefined;
  const url = useSyncExternalStore(subscribe, getUrl, getUrl);

  function append(entry: Omit<LogEntry, 'id' | 'time'>) {
    const item: LogEntry = { ...entry, id: nextId.current++, time: Date.now() };
    setLog((prev) => (prev.length >= maxEntries ? [...prev.slice(1), item] : [...prev, item]));
  }

  function disconnect() {
    const socket = socketRef.current;
    if (!socket) return;
    // the session ends now, events of the closing socket are ignored
    socket.onopen = socket.onmessage = socket.onclose = null;
    if (socket.readyState === WebSocket.OPEN) append({ type: 'closed', code: 1000 });
    socket.close(1000);
    socketRef.current = null;
    setStatus('closed');
  }

  // a session belongs to its URL, it ends when the URL changes and with the page
  const endSession = useEffectEvent(disconnect);
  useEffect(() => () => endSession(), [url]);

  return {
    stf,
    url,
    status,
    connect() {
      if (!url || socketRef.current) return;
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch (e) {
        append({ type: 'error', data: e instanceof Error ? e.message : String(e) });
        return;
      }

      let opened = false;
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;
      setStatus('connecting');
      socket.onopen = () => {
        opened = true;
        setStatus('open');
        append({ type: 'opened', data: url });
      };
      socket.onmessage = (event: MessageEvent<string | ArrayBuffer>) => {
        if (typeof event.data === 'string') {
          append({
            type: 'received',
            data: event.data,
            message: identifyMessage(event.data, channelMessages.incoming),
          });
        } else {
          append({ type: 'received', bytes: event.data.byteLength });
        }
      };
      // errors are followed by closing, browsers don't tell more about them
      socket.onclose = (event) => {
        socketRef.current = null;
        setStatus('closed');
        append(
          opened
            ? { type: 'closed', code: event.code, data: event.reason }
            : { type: 'error', code: event.code },
        );
      };
    },
    disconnect,
    send(data, message) {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(data);
      append({ type: 'sent', data, message });
    },
    log,
    clearLog() {
      setLog([]);
    },
  };
}
