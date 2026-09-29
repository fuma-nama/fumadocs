'use client';
import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
};
const noop = () => () => {};
const getServerSnapshot = () => undefined;

/**
 * @returns `undefined` on the server, during hydration, or when disabled.
 */
export function useIsScrollTop({ enabled = true }: { enabled?: boolean }): boolean | undefined {
  return useSyncExternalStore(
    enabled ? subscribe : noop,
    () => (enabled ? window.scrollY < 10 : undefined),
    getServerSnapshot,
  );
}
