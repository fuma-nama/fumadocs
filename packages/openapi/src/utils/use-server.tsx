'use client';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { useServerStore } from 'shared-api/utils/use-server-store';
import { joinURL, resolveServerUrl } from 'shared-api/utils/url';
import type { ServerObject } from '@/types';

export interface SelectedServer {
  url: string;
  name?: string;
  variables: Record<string, string>;
}

interface ServerContextType {
  servers?: ServerObject[];
  server: SelectedServer | null;
  /**
   * The URL of `pathname` on the selected server, with the server variables resolved.
   *
   * It is resolved against the page origin, which also serves the request when no server is
   * selected. On the server and during hydration the origin is unknown, so it is
   * `https://example.com`.
   */
  resolveUrl: (pathname?: string) => string;
  setServer: (value: string) => void;
  setServerVariables: (value: Record<string, string>) => void;
}

const ServerContext = createContext<ServerContextType | null>(null);
const keyOfServer = (server: SelectedServer) => server.url;
const noop = () => () => {};

export function useServer(): ServerContextType {
  const ctx = use(ServerContext);
  if (!ctx) throw new Error('Component must be used under <OpenAPIProvider />');

  return ctx;
}

export function ServerProvider({
  servers,
  storageKeyPrefix,
  children,
}: {
  servers?: ServerObject[];
  storageKeyPrefix: string;
  children: ReactNode;
}) {
  const resolve = useCallback(
    (url: string): SelectedServer | null => {
      const server = servers?.find((item) => item.url === url);
      if (!server) return null;

      return { name: server.name, url, variables: getDefaultValues(server) };
    },
    [servers],
  );
  const store = useServerStore({
    storageKey: `${storageKeyPrefix}server-url`,
    keyOf: keyOfServer,
    resolve,
    defaultKey: servers?.[0]?.url,
  });
  const { server } = store;
  const isClient = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const resolveUrl = useCallback(
    (pathname = '') => {
      const base = isClient
        ? new URL(
            server ? resolveServerUrl(server.url, server.variables) : '/',
            window.location.origin,
          ).href
        : 'https://example.com';

      return pathname ? joinURL(base, pathname) : base;
    },
    [server, isClient],
  );

  return (
    <ServerContext
      value={useMemo(() => ({ servers, resolveUrl, ...store }), [servers, resolveUrl, store])}
    >
      {children}
    </ServerContext>
  );
}

function getDefaultValues(server: ServerObject): Record<string, string> {
  const out: Record<string, string> = {};
  if (!server.variables) return out;

  for (const [k, v] of Object.entries(server.variables)) {
    if (v.default !== undefined) out[k] = String(v.default);
  }

  return out;
}
