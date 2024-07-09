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
  const { createHighlighterCore } = await import('shiki/core');
  const getWasm = await import('shiki/wasm');

  return createHighlighterCore({
    themes: [
      import('shiki/themes/github-light.mjs'),
      import('shiki/themes/github-dark.mjs'),
    ],
    langs: [import('shiki/langs/json.mjs')],
    loadWasm: getWasm,
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
    if (highlighterInstance) setHighlighter(highlighterInstance);
    else
      void initHighlighter().then((res) => {
        setHighlighter(res);
      });
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
