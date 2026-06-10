'use client';
import { createContext, type ReactNode, use, useEffect, useMemo, useState } from 'react';
import type { RenderContext, ServerObject } from '@/types';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { useStorageKey } from '../client/storage-key';
import { getDefaultValues } from '@/utils/server-url';
import { isPlainObject } from '@/utils/is-plain-object';

interface ServerContextType {
  servers: Record<string, NoReference<ServerObject>>;
  server: SelectedServer | null;
  setServer: (serverId: string) => void;
  setServerVariables: (value: Record<string, string>) => void;
}

interface SelectedServer {
  id: string;
  variables: Record<string, string>;
}

const Context = createContext<RenderContext | null>(null);
const ServerContext = createContext<ServerContextType | null>(null);

export function useRenderContext(): RenderContext {
  const ctx = use(Context);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

  return ctx;
}

export function useServerContext() {
  const ctx = use(ServerContext);
  if (!ctx) throw new Error('Component must be used under <ServerProvider />');
  return ctx;
}

export function RenderContextProvider({
  children,
  ctx,
}: {
  ctx: RenderContext;
  children: ReactNode;
}) {
  return <Context value={ctx}>{children}</Context>;
}

export function ServerProvider({
  servers,
  children,
}: {
  servers: Record<string, NoReference<ServerObject>>;
  children: ReactNode;
}) {
  const storageKey = useStorageKey().of('server-url');
  const [server, setServer] = useState<SelectedServer | null>(() => {
    const ids = Object.keys(servers);
    if (ids.length === 0) return null;

    return {
      id: ids[0],
      variables: getDefaultValues(servers[ids[0]]),
    };
  });

  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (!cached) return;

    try {
      const obj: unknown = JSON.parse(cached);
      if (
        isPlainObject(obj) &&
        isPlainObject(obj.variables) &&
        typeof obj.id === 'string' &&
        obj.id in servers
      ) {
        setServer(obj as unknown as SelectedServer);
      }
    } catch {
      // ignore
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only at mount
  }, []);

  return (
    <ServerContext
      value={useMemo(
        () => ({
          servers,
          server,
          setServerVariables(variables) {
            setServer((prev) => {
              if (!prev) return null;
              const selected = servers[prev.id];
              if (!selected) return prev;

              const updated: SelectedServer = {
                ...prev,
                variables,
              };
              localStorage.setItem(storageKey, JSON.stringify(updated));
              return updated;
            });
          },
          setServer(serverId) {
            const schema = servers[serverId];
            if (!schema) return;

            const result: SelectedServer = {
              id: serverId,
              variables: getDefaultValues(schema),
            };

            localStorage.setItem(storageKey, JSON.stringify(result));
            setServer(result);
          },
        }),
        [server, servers, storageKey],
      )}
    >
      {children}
    </ServerContext>
  );
}
