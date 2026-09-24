'use client';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type AnnounceFn = (message: string) => void;

const AnnouncerContext = createContext<AnnounceFn>(() => {});

/**
 * Get a function to push a message to the shared `aria-live` status region rendered by `RootProvider`.
 */
export function useAnnouncer(): AnnounceFn {
  return use(AnnouncerContext);
}

export function AnnouncerProvider({ children }: { children?: ReactNode }) {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<number | null>(null);

  const announce = useCallback<AnnounceFn>((value) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    // clear first so identical, consecutive messages are still announced by screen readers
    setMessage('');
    timeoutRef.current = window.setTimeout(() => {
      setMessage(value);
    }, 50);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <AnnouncerContext value={announce}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {message}
      </div>
    </AnnouncerContext>
  );
}
