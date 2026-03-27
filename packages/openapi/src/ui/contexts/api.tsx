'use client';
import { createContext, type ReactNode, use, useEffect, useMemo, useState } from 'react';
import type { RenderContext, ServerObject } from '@/types';
import { defaultAdapters, type MediaAdapter } from '@/requests/media/adapter';
import { useStorageKey } from '../client/storage-key';
import type { APIPageClientOptions } from '../client';
import {
  type CodeUsageGeneratorRegistry,
  createCodeUsageGeneratorRegistry,
} from '@/requests/generators';
import { registerDefault } from '@/requests/generators/all';

interface InheritFromContext extends Pick<RenderContext, 'shikiOptions'> {
  client: APIPageClientOptions;
}

interface ServerContextType {
  servers?: ServerObject[];
  server: SelectedServer | null;
  setServer: (value: string) => void;
  setServerVariables: (value: Record<string, string>) => void;
}

export type ApiProviderProps = InheritFromContext;

export interface SelectedServer {
  url: string;
  name?: string;
  variables: Record<string, string>;
}

interface ApiContextType extends InheritFromContext {
  mediaAdapters: Record<string, MediaAdapter>;
  codeUsages: CodeUsageGeneratorRegistry;
}

const ApiContext = createContext<ApiContextType | null>(null);
const ServerContext = createContext<ServerContextType | null>(null);

export function useApiContext(): ApiContextType {
  const ctx = use(ApiContext);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

  return ctx;
}

export function useServerContext() {
  const ctx = use(ServerContext);
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
      value={useMemo(() => {
        let codeUsages: CodeUsageGeneratorRegistry;
        if (client.codeUsages) {
          codeUsages = createCodeUsageGeneratorRegistry(client.codeUsages);
        } else {
          codeUsages = createCodeUsageGeneratorRegistry();
          registerDefault(codeUsages);
        }

        return {
          shikiOptions,
          client,
          codeUsages,
          mediaAdapters: {
            ...defaultAdapters,
            ...client.mediaAdapters,
          },
        };
      }, [client, shikiOptions])}
    >
      {children}
    </ApiContext>
  );
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

    return {
      name: defaultItem.name,
      url: defaultItem.url!,
      variables: getDefaultValues(defaultItem),
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
              if (!prev) return null;

              const updated = { ...prev, variables };
              localStorage.setItem(storageKey, JSON.stringify(updated));
              return updated;
            });
          },
          setServer(value) {
            const obj = servers?.find((item) => item.url === value);
            if (!obj) return;

            const result: SelectedServer = {
              name: obj.name,
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
    if (v.default !== undefined) out[k] = String(v.default);
  }

  return out;
}
