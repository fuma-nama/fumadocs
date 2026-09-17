'use client';
import { createContext, type ReactNode, use, useCallback, useMemo } from 'react';
import { useServerStore } from '@fumadocs/api-docs/utils/use-server-store';
import type { ServerObject } from '@/types';
import { getDefaultValues } from '@/utils/server-url';

export interface SelectedServer {
  id: string;
  variables: Record<string, string>;
}

interface ServerContextType {
  servers: Record<string, ServerObject>;
  server: SelectedServer | null;
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

      return { id, variables: getDefaultValues(server) };
    },
    [servers],
  );
  const store = useServerStore({
    storageKey: storageKeyPrefix + 'server-url',
    keyOf: keyOfServer,
    resolve,
    defaultKey: Object.keys(servers)[0],
  });

  return (
    <ServerContext value={useMemo(() => ({ servers, ...store }), [servers, store])}>
      {children}
    </ServerContext>
  );
}
