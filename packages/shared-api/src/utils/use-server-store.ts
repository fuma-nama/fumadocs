'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isPlainObject } from '@/utils/is-plain-object';

export interface ServerStore<T> {
  server: T | null;
  /** select a server by key, resetting its variables to the default values */
  setServer: (key: string) => void;
  setServerVariables: (variables: Record<string, string>) => void;
}

export interface ServerStoreOptions<T> {
  storageKey: string;
  /** the key of a server, like its id or URL */
  keyOf: (server: T) => string;
  /** the state of a server key, `null` when the key doesn't exist */
  resolve: (key: string) => T | null;
  /** the key to select by default */
  defaultKey?: string;
}

/**
 * The selected server of an API page, persisted in `localStorage`.
 */
export function useServerStore<T extends { variables: Record<string, string> }>({
  storageKey,
  keyOf,
  resolve,
  defaultKey,
}: ServerStoreOptions<T>): ServerStore<T> {
  const [server, setServer] = useState<T | null>(() =>
    defaultKey !== undefined ? resolve(defaultKey) : null,
  );
  const restored = useRef<string>(undefined);

  useEffect(() => {
    // `localStorage` is unavailable on the first render, and only the initial value is cached
    if (restored.current === storageKey) return;
    restored.current = storageKey;

    const cached = localStorage.getItem(storageKey);
    if (!cached) return;

    try {
      const value: unknown = JSON.parse(cached);
      if (!isPlainObject(value) || !isPlainObject(value.variables)) return;

      const server = resolve(keyOf(value as T));
      if (server) setServer({ ...server, variables: value.variables as Record<string, string> });
    } catch {
      // ignore malformed values
    }
  }, [storageKey, keyOf, resolve]);

  return useMemo(
    () => ({
      server,
      setServer(key) {
        const next = resolve(key);
        if (!next) return;

        localStorage.setItem(storageKey, JSON.stringify(next));
        setServer(next);
      },
      setServerVariables(variables) {
        setServer((prev) => {
          if (!prev) return null;

          const next = { ...prev, variables };
          localStorage.setItem(storageKey, JSON.stringify(next));
          return next;
        });
      },
    }),
    [server, resolve, storageKey],
  );
}
