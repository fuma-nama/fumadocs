import { createContext, useContext, useEffect, useState } from 'react';
import type { HighlighterCore } from 'shiki/core';

export interface ApiProviderProps {
  /**
   * Base URL for API requests
   */
  defaultBaseUrl?: string;

  children?: React.ReactNode;
}

interface ApiContextType {
  baseUrl?: string;
  setBaseUrl: (value: string) => void;
  highlighter: HighlighterCore | null;
}

const ApiContext = createContext<ApiContextType>({
  baseUrl: undefined,
  setBaseUrl: () => undefined,
  highlighter: null,
});

export function useApiContext(): ApiContextType {
  return useContext(ApiContext);
}

async function initHighlighter(): Promise<HighlighterCore> {
  const { getSingletonHighlighter } = await import('shiki/bundle/web');

  return getSingletonHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: ['json'],
  });
}

let highlighterInstance: HighlighterCore | undefined;

export function ApiProvider({
  defaultBaseUrl,
  children,
}: ApiProviderProps): React.ReactElement {
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null);
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);

  useEffect(() => {
    setBaseUrl((prev) => localStorage.getItem('apiBaseUrl') ?? prev);
    if (highlighterInstance) {
      setHighlighter(highlighterInstance);
    } else {
      void initHighlighter().then((res) => {
        highlighterInstance = res;
        setHighlighter(res);
      });
    }
  }, []);

  useEffect(() => {
    if (baseUrl) localStorage.setItem('apiBaseUrl', baseUrl);
  }, [baseUrl]);

  return (
    <ApiContext.Provider value={{ baseUrl, setBaseUrl, highlighter }}>
      {children}
    </ApiContext.Provider>
  );
}
