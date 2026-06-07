'use client';
import { createContext, type ReactNode, use, useEffect, useMemo, useState } from 'react';
import type { RenderContext, ServerObject } from '@/types';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { useStorageKey } from '../client/storage-key';
import { resolveServerUrl } from '@/utils/operation';

interface ServerContextType {
  servers?: ServerObject[];
  server: SelectedServer | null;
  setServer: (value: string) => void;
  setServerVariables: (value: Record<string, string>) => void;
}

interface SelectedServer {
  url: string;
  name?: string;
  variables: Record<string, string>;
}

const Context = createContext<RenderContext | null>(null);
const ServerContext = createContext<ServerContextType | null>(null);

export function useRenderContext(): RenderContext {
  const ctx = use(Context);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

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
  servers?: ServerObject[];
  children: ReactNode;
}) {
  const storageKey = useStorageKey().of('server-url');
  const [server, setServer] = useState<SelectedServer | null>(() => {
    if (!servers || servers.length === 0) return null;
    const defaultItem = servers[0];
    const variables = getDefaultValues(defaultItem);

    return {
      name: defaultItem.description,
      url: resolveServerUrl(defaultItem as NoReference<ServerObject>, variables),
      variables,
    };
  });

  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
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
  }, [storageKey]);

  return (
    <ServerContext
      value={useMemo(
        () => ({
          servers,
          server,
          setServerVariables(variables) {
            setServer((prev) => {
              if (!prev || !servers) return null;

              const selected = servers.find(
                (item) =>
                  resolveServerUrl(item as NoReference<ServerObject>, variables) === prev.url,
              );
              const target = selected ?? servers[0];
              const updated = {
                ...prev,
                variables,
                url: resolveServerUrl(target as NoReference<ServerObject>, variables),
              };
              localStorage.setItem(storageKey, JSON.stringify(updated));
              return updated;
            });
          },
          setServer(value) {
            const obj = servers?.find(
              (item) => resolveServerUrl(item as NoReference<ServerObject>) === value,
            );
            if (!obj) return;

            const result: SelectedServer = {
              name: obj.description,
              url: value,
              variables: getDefaultValues(obj),
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

function getDefaultValues(server: ServerObject): Record<string, string> {
  const out: Record<string, string> = {};
  if (!server.variables) return out;

  for (const [k, v] of Object.entries(server.variables)) {
    if (typeof v === 'object' && v !== null && 'default' in v && v.default !== undefined) {
      out[k] = String(v.default);
    }
  }

  return out;
}
