'use client';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { RenderContext, ServerObject } from '@/types';
import { defaultAdapters, type MediaAdapter } from '@/requests/media/adapter';
import type { NoReference } from '@/utils/schema';

export interface ApiProviderProps
  extends Omit<ApiContextType, 'mediaAdapters'> {
  /**
   * Base URL for API requests
   */
  defaultBaseUrl?: string;
  children?: ReactNode;
  mediaAdapters?: Record<string, MediaAdapter>;
  /**
   * Custom localStorage key for server selection.
   * 
   * @defaultValue 'apiBaseUrl'
   */
  storageKey?: string;
}

export interface SelectedServer {
  url: string;
  variables: Record<string, string>;
}

interface ApiContextType {
  servers: NoReference<ServerObject>[];
  shikiOptions: RenderContext['shikiOptions'];
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
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

  return ctx;
}

export function useServerSelectContext(): ServerSelectType {
  const ctx = useContext(ServerSelectContext);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

  return ctx;
}

export function ApiProvider({
  defaultBaseUrl,
  children,
  servers,
  mediaAdapters,
  shikiOptions,
  storageKey = 'apiBaseUrl',
}: ApiProviderProps) {
  const [server, setServer] = useState<SelectedServer | null>(() => {
    const defaultItem = defaultBaseUrl
      ? servers.find((item) => item.url === defaultBaseUrl)
      : servers.at(0);

    return defaultItem
      ? {
          url: defaultItem.url,
          variables: getDefaultValues(defaultItem),
        }
      : null;
  });

  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (!cached) return;

    try {
      const obj = JSON.parse(cached);
      if (!obj || typeof obj !== 'object') return;

      setServer(obj);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return (
    <ApiContext.Provider
      value={useMemo(
        () => ({
          shikiOptions,
          mediaAdapters: {
            ...defaultAdapters,
            ...mediaAdapters,
          },
          servers,
        }),
        [mediaAdapters, servers, shikiOptions],
      )}
    >
      <ServerSelectContext.Provider
        value={useMemo(
          () => ({
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
              const obj = servers.find((item) => item.url === value);
              if (!obj) return;

              const result: SelectedServer = {
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
      </ServerSelectContext.Provider>
    </ApiContext.Provider>
  );
}

function getDefaultValues(
  server: NoReference<ServerObject>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(server.variables ?? {}).map(([k, v]) => [k, v.default]),
  );
}
