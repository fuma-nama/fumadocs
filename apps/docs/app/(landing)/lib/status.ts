import { useSyncExternalStore } from 'react';

let status = 'ready';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStatus(): string {
  return status;
}

/** the line shown after `status:` in the status bar */
export function setStatus(next: string) {
  if (next === status) return;
  status = next;
  for (const listener of listeners) listener();
}

export function useStatus(): string {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => 'ready',
  );
}
