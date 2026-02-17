'use client';
import {
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { RenderContext, ServerObject } from '@/types';
import { defaultAdapters, type MediaAdapter } from '@/requests/media/adapter';
import type { NoReference } from '@/utils/schema';
import { useStorageKey } from '../client/storage-key';
import type { APIPageClientOptions } from '../client';

interface InheritFromContext extends Pick<RenderContext, 'shikiOptions'> {
  client: APIPageClientOptions;
}

export interface ServerProviderProps {
  /**
   * Base URL for API requests
   */
  defaultBaseUrl?: string;

  servers: NoReference<ServerObject>[];
}

interface ServerContextType extends ServerProviderProps {
  /**
   * ref to selected API server (to query)
   */
  serverRef: RefObject<SelectedServer | null>;
}

const ServerContext = createContext<ServerContextType | null>(null);

export type ApiProviderProps = InheritFromContext;

export interface SelectedServer {
  url: string;
  name?: string;
  variables: Record<string, string>;
}

interface ApiContextType extends InheritFromContext {
  mediaAdapters: Record<string, MediaAdapter>;
}

interface ServerSelectType {
  server: SelectedServer | null;
  setServer: (value: string) => void;
  setServerVariables: (value: Record<string, string>) => void;
}

const ApiContext = createContext<ApiContextType | null>(null);
const ServerSelectContext = createContext<ServerSelectType | null>(null);

export function useApiContext(): ApiContextType {
  const ctx = use(ApiContext);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

  return ctx;
}

export function useServerContext() {
  return use(ServerContext)!;
}

export function useServerSelectContext(): ServerSelectType {
  const ctx = use(ServerSelectContext);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

  return ctx;
}

export function ApiProvider({
  children,
  shikiOptions,
  client,
}: ApiProviderProps & { children: ReactNode }) {
  return (
    <ApiContext
      value={useMemo(
        () => ({
          shikiOptions,
          client,
          mediaAdapters: {
            ...defaultAdapters,
            ...client.mediaAdapters,
          },
        }),
        [client, shikiOptions],
      )}
    >
      {children}
    </ApiContext>
  );
}

export function ServerProvider({
  servers,
  defaultBaseUrl,
  children,
}: ServerProviderProps & { children: ReactNode }) {
  const serverRef = useRef<SelectedServer | null>(null);

  return (
    <ServerContext value={useMemo(() => ({ servers, serverRef }), [servers])}>
      <ServerSelectProvider defaultBaseUrl={defaultBaseUrl}>{children}</ServerSelectProvider>
    </ServerContext>
  );
}

function ServerSelectProvider({
  defaultBaseUrl,
  children,
}: Pick<ServerProviderProps, 'defaultBaseUrl'> & {
  children: ReactNode;
}) {
  const { servers, serverRef } = use(ServerContext)!;
  const storageKeys = useStorageKey();
  const [server, setServer] = useState<SelectedServer | null>(() => {
    const defaultItem = defaultBaseUrl
      ? servers.find((item) => item.url === defaultBaseUrl)
      : servers[0];

    return defaultItem
      ? {
          name: defaultItem.name,
          url: defaultItem.url!,
          variables: getDefaultValues(defaultItem),
        }
      : null;
  });
  serverRef.current = server;

  useEffect(() => {
    const cached = localStorage.getItem(storageKeys.of('server-url'));
    if (!cached) return;

    try {
      const obj: unknown = JSON.parse(cached);
      if (
        typeof obj === 'object' &&
        obj !== null &&
        'url' in obj &&
        typeof obj.url === 'string' &&
        'variables' in obj &&
        typeof obj.variables === 'object' &&
        obj.variables !== null
      ) {
        setServer(obj as SelectedServer);
      }
    } catch {
      // ignore
    }
  }, [storageKeys]);

  return (
    <ServerSelectContext
      value={useMemo(
        () => ({
          server,
          setServerVariables(variables) {
            setServer((prev) => {
              if (!prev) return null;

              const updated = { ...prev, variables };
              localStorage.setItem(storageKeys.of('server-url'), JSON.stringify(updated));
              return updated;
            });
          },
          setServer(value) {
            const obj = servers.find((item) => item.url === value);
            if (!obj) return;

            const result: SelectedServer = {
              name: obj.name,
              url: value,
              variables: getDefaultValues(obj),
            };

            localStorage.setItem(storageKeys.of('server-url'), JSON.stringify(result));
            setServer(result);
          },
        }),
        [server, servers, storageKeys],
      )}
    >
      {children}
    </ServerSelectContext>
  );
}

function getDefaultValues(server: NoReference<ServerObject>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!server.variables) return out;

  for (const [k, v] of Object.entries(server.variables)) {
    if (v.default !== undefined) out[k] = String(v.default);
  }

  return out;
}
