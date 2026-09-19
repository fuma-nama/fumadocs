'use client';
import { createContext, type ReactNode, use, useCallback, useMemo } from 'react';
import { useServerStore } from 'shared-api/utils/use-server-store';
import type { ServerObject } from '@/types';

export interface SelectedServer {
  url: string;
  name?: string;
  variables: Record<string, string>;
}

interface ServerContextType {
  servers?: ServerObject[];
  server: SelectedServer | null;
  setServer: (value: string) => void;
  setServerVariables: (value: Record<string, string>) => void;
}

const ServerContext = createContext<ServerContextType | null>(null);
const keyOfServer = (server: SelectedServer) => server.url;

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

  return (
    <ServerContext value={useMemo(() => ({ servers, ...store }), [servers, store])}>
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
