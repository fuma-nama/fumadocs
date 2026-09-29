'use client';
import { createContext, type ReactNode, use, useCallback, useMemo } from 'react';
import { useServerStore } from 'shared-api/utils/use-server-store';
import type { ServerObject } from '@/types';
import { getDefaultValues, resolveServerUrl } from '@/utils/server-url';
import { idToTitle } from 'shared-api/utils/id-to-title';

export interface SelectedServer {
  id: string;
  title: string;
  variables: Record<string, string>;
}

interface ServerContextType {
  servers: Record<string, ServerObject>;
  server: SelectedServer | null;
  /**
   * The URL of the selected server, with its variables resolved.
   *
   * Naming a server returns its URL as the document declares it, variables included.
   */
  resolveUrl: (id?: string) => string | undefined;
  setServer: (serverId: string) => void;
  setServerVariables: (value: Record<string, string>) => void;
}

const ServerContext = createContext<ServerContextType | null>(null);

export function useServer(): ServerContextType {
  const ctx = use(ServerContext);
  if (!ctx) throw new Error('Component must be used under <AsyncAPIProvider />');

  return ctx;
}

const keyOfServer = (server: SelectedServer) => server.id;

export function ServerProvider({
  servers,
  storageKeyPrefix,
  children,
}: {
  servers: Record<string, ServerObject>;
  storageKeyPrefix: string;
  children: ReactNode;
}) {
  const resolve = useCallback(
    (id: string): SelectedServer | null => {
      const server = servers[id];
      if (!server) return null;

      return { id, title: idToTitle(id), variables: getDefaultValues(server) };
    },
    [servers],
  );
  const store = useServerStore({
    storageKey: storageKeyPrefix + 'server-url',
    keyOf: keyOfServer,
    resolve,
    defaultKey: Object.keys(servers)[0],
  });

  const { server } = store;
  const resolveUrl = useCallback(
    (id?: string) => {
      const schema = servers[id ?? server?.id ?? ''];
      if (!schema) return;

      return resolveServerUrl(schema, id === undefined && server ? server.variables : {});
    },
    [servers, server],
  );

  return (
    <ServerContext
      value={useMemo(() => ({ servers, resolveUrl, ...store }), [servers, resolveUrl, store])}
    >
      {children}
    </ServerContext>
  );
}
