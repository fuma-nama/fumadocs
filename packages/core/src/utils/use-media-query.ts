import { useCallback, useSyncExternalStore } from 'react';

const getServerSnapshot = () => null;

/**
 * @returns `null` on the server, during hydration, or when disabled.
 */
export function useMediaQuery(query: string, disabled = false): boolean | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (disabled) return () => {};

      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query, disabled],
  );

  return useSyncExternalStore(
    subscribe,
    () => (disabled ? null : window.matchMedia(query).matches),
    getServerSnapshot,
  );
}
