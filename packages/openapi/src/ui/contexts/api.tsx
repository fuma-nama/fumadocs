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

type InheritFromContext = Pick<Required<RenderContext>, 'servers' | 'client'> &
  Pick<RenderContext, 'shikiOptions'>;

export interface ApiProviderProps extends InheritFromContext {
  /**
   * Base URL for API requests
   */
  defaultBaseUrl?: string;
}

export interface SelectedServer {
  url: string;
  variables: Record<string, string>;
}

interface ApiContextType extends InheritFromContext {
  /**
   * ref to selected API server (to query)
   */
  serverRef: RefObject<SelectedServer | null>;

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

export function useServerSelectContext(): ServerSelectType {
  const ctx = use(ServerSelectContext);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

  return ctx;
}

export function ApiProvider({
  defaultBaseUrl,
  children,
  servers,
  shikiOptions,
  client,
}: ApiProviderProps & { children: ReactNode }) {
  const serverRef = useRef<SelectedServer | null>(null);

  return (
    <ApiContext
      value={useMemo(
        () => ({
          serverRef,
          shikiOptions,
          client,
          mediaAdapters: {
            ...defaultAdapters,
            ...client.mediaAdapters,
          },
          servers,
        }),
        [servers, client, shikiOptions],
      )}
    >
      <ServerSelectProvider defaultBaseUrl={defaultBaseUrl}>
        {children}
      </ServerSelectProvider>
    </ApiContext>
  );
}

function ServerSelectProvider({
  defaultBaseUrl,
  children,
}: Pick<ApiProviderProps, 'defaultBaseUrl'> & {
  children: ReactNode;
}) {
  const { servers, serverRef } = useApiContext();
  const storageKeys = useStorageKey();
  const [server, setServer] = useState<SelectedServer | null>(() => {
    const defaultItem = defaultBaseUrl
      ? servers.find((item) => item.url === defaultBaseUrl)
      : servers[0];

    return defaultItem
      ? {
          url: defaultItem.url,
          variables: getDefaultValues(defaultItem),
        }
      : null;
  });
  serverRef.current = server;

  useEffect(() => {
    const cached = localStorage.getItem(storageKeys.of('server-url'));
    if (!cached) return;

    try {
      const obj = JSON.parse(cached);
      if (!obj || typeof obj !== 'object') return;

      setServer(obj);
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
              localStorage.setItem(
                storageKeys.of('server-url'),
                JSON.stringify(updated),
              );
              return updated;
            });
          },
          setServer(value) {
            const obj = servers.find((item) => item.url === value);
            if (!obj) return;

            const result: SelectedServer = {
              url: value,
              variables: getDefaultValues(obj),
            };

            localStorage.setItem(
              storageKeys.of('server-url'),
              JSON.stringify(result),
            );
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

function getDefaultValues(
  server: NoReference<ServerObject>,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!server.variables) return out;

  for (const [k, v] of Object.entries(server.variables)) {
    out[k] = v.default;
  }

  return out;
}
