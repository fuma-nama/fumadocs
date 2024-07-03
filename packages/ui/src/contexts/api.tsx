import { createContext, useContext, useEffect, useState } from 'react';
import { createHighlighter, Highlighter } from 'shiki';

export interface ApiProviderProps {
  /**
   * Base URL for API requests
   */
  defaultBaseUrl?: string;

  children?: React.ReactNode;
}

interface ApiContextType {
  baseUrl: string;
  setBaseUrl: (value: string) => void;
  highlighter: Highlighter | null;
}

const ApiContext = createContext<ApiContextType>({
  baseUrl: '',
  setBaseUrl: () => undefined,
  highlighter: null,
});

export function useApiContext(): ApiContextType {
  return useContext(ApiContext);
}

export function ApiProvider({
  defaultBaseUrl,
  children,
}: ApiProviderProps): React.ReactElement {
  const [baseUrl, setBaseUrl] = useState(() => {
    return localStorage.getItem('apiBaseUrl') ?? defaultBaseUrl ?? "";
  });

  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

  useEffect(() => {
    localStorage.setItem('apiBaseUrl', baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    const loadHighlighter = async () => {
      const hl = await createHighlighter({
        langs: ['json'],
        themes: ['github-light', 'github-dark'],
      });
      setHighlighter(hl);
    };

    void loadHighlighter();
  }, []);

  return (
    <ApiContext.Provider value={{ baseUrl, setBaseUrl, highlighter }}>
      {children}
    </ApiContext.Provider>
  );
}
