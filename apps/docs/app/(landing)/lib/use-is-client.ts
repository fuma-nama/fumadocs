import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/** `false` on the server and during hydration */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
