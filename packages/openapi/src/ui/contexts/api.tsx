import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import type { RenderContext } from '@/types';

export interface ApiProviderProps {
  /**
   * Base URL for API requests
   */
  defaultBaseUrl?: string;
  shikiOptions: RenderContext['shikiOptions'];

  children?: ReactNode;
}

interface ApiContextType {
  baseUrl?: string;
  setBaseUrl: (value: string) => void;
  shikiOptions: RenderContext['shikiOptions'];
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function useApiContext(): ApiContextType {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('Component must be used under <ApiProvider />');

  return ctx;
}

export function ApiProvider({
  defaultBaseUrl,
  shikiOptions,
  children,
}: ApiProviderProps): React.ReactElement {
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);

  useEffect(() => {
    setBaseUrl((prev) => localStorage.getItem('apiBaseUrl') ?? prev);
  }, []);

  useOnChange(baseUrl, () => {
    if (baseUrl) localStorage.setItem('apiBaseUrl', baseUrl);
  });

  return (
    <ApiContext.Provider
      value={useMemo(
        () => ({
          baseUrl,
          setBaseUrl,
          shikiOptions,
        }),
        [baseUrl, shikiOptions],
      )}
    >
      {children}
    </ApiContext.Provider>
  );
}
