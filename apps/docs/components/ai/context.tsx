'use client';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';

export interface Engine {
  prompt: (
    text: string,
    onUpdate?: (full: string) => void,
    onEnd?: (full: string) => void,
  ) => Promise<void>;

  abortAnswer: () => void;
  getHistory: () => MessageRecord[];
  clearHistory: () => void;
  regenerateLast: (
    onUpdate?: (full: string) => void,
    onEnd?: (full: string) => void,
  ) => Promise<void>;
}

export interface MessageRecord {
  role: 'user' | 'assistant';
  content: string;

  suggestions?: string[];
  references?: MessageReference[];
}

export interface MessageReference {
  breadcrumbs?: string[];
  title: string;
  description?: string;
  url: string;
}

type EngineType = 'inkeep';

const Context = createContext<{
  engine?: Engine;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onSubmit: (message: string) => void;

  regenerateLast: () => void;
  abortAnswer: () => void;
  clearMessages: () => void;
} | null>(null);

const listeners: (() => void)[] = [];

function onUpdate() {
  for (const listener of listeners) listener();
}

export function AIProvider({
  type,
  children,
  loadEngine = false,
}: {
  type: EngineType;
  children: ReactNode;
  loadEngine?: boolean;
}) {
  const pendingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<Engine>();

  useEffect(() => {
    if (!loadEngine || pendingRef.current) return;
    pendingRef.current = true;
    // preload processor
    void import('./markdown-processor');

    if (type === 'inkeep') {
      void import('./engines/inkeep').then(async (res) => {
        setEngine(await res.createInkeepEngine());
      });
    }
  }, [type, loadEngine]);

  const onSubmit = useEffectEvent((message: string) => {
    if (!engine || message.length === 0) return;

    setLoading(true);
    void engine.prompt(message, onUpdate).finally(() => {
      setLoading(false);
    });
  });

  const regenerateLast = useEffectEvent(() => {
    if (!engine) return;

    setLoading(true);
    void engine.regenerateLast(onUpdate).finally(() => {
      setLoading(false);
    });
  });

  const clearMessages = useEffectEvent(() => {
    engine?.clearHistory();
    onUpdate();
  });

  return (
    <Context
      value={useMemo(
        () => ({
          loading,
          setLoading,
          onSubmit,
          engine,
          abortAnswer: () => engine?.abortAnswer(),
          regenerateLast,
          clearMessages,
        }),
        [loading, onSubmit, engine, regenerateLast, clearMessages],
      )}
    >
      {children}
    </Context>
  );
}

export function useAI() {
  return useContext(Context)!;
}

export function useAIMessages() {
  const [_, update] = useState(0);
  const { engine } = useAI();

  useEffect(() => {
    const listener = () => {
      update((prev) => prev + 1);
    };

    listeners.push(listener);
    return () => {
      listeners.splice(listeners.indexOf(listener), 1);
    };
  }, []);

  return engine?.getHistory() ?? [];
}
