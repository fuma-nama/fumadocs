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
import type { MediaAdapter } from '@/media/adapter';

export interface ApiProviderProps {
  /**
   * Base URL for API requests
   */
  defaultBaseUrl?: string;

  servers: ServerObject[];
  shikiOptions: RenderContext['shikiOptions'];
  mediaAdapters: Record<string, MediaAdapter>;

  children?: ReactNode;
}

export interface SelectedServer {
  url: string;
  variables: Record<string, string>;
}

type ApiContextType = Omit<ApiProviderProps, 'children' | 'defaultBaseUrl'>;

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
  ...props
}: ApiProviderProps) {
  const [server, setServer] = useState<SelectedServer | null>(() => {
    const defaultItem = defaultBaseUrl
      ? props.servers.find((item) => item.url === defaultBaseUrl)
      : undefined;

    return defaultItem
      ? {
          url: defaultItem.url,
          variables: getDefaultValues(defaultItem),
        }
      : null;
  });

  useEffect(() => {
    const cached = localStorage.getItem('apiBaseUrl');
    if (!cached) return;

    try {
      const obj = JSON.parse(cached);
      if (!obj || typeof obj !== 'object') return;

      setServer(obj);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ApiContext.Provider value={props}>
      <ServerSelectContext.Provider
        value={useMemo(
          () => ({
            server,
            setServerVariables(variables) {
              setServer((prev) => {
                if (!prev) return null;

                const updated = { ...prev, variables };
                localStorage.setItem('apiBaseUrl', JSON.stringify(updated));
                return updated;
              });
            },
            setServer(value) {
              const obj = props.servers.find((item) => item.url === value);
              if (!obj) return;

              const result: SelectedServer = {
                url: value,
                variables: getDefaultValues(obj),
              };

              localStorage.setItem('apiBaseUrl', JSON.stringify(result));
              setServer(result);
            },
          }),
          [server, props.servers],
        )}
      >
        {children}
      </ServerSelectContext.Provider>
    </ApiContext.Provider>
  );
}

function getDefaultValues(server: ServerObject): Record<string, string> {
  return Object.fromEntries(
    Object.entries(server.variables ?? {}).map(([k, v]) => [k, v.default]),
  );
}
