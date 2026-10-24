import { useSyncExternalStore } from 'react';

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function tick() {
  now = Math.floor(Date.now() / 1000) * 1000;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Math.floor(Date.now() / 1000) * 1000;
    timer = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    clearInterval(timer);
    timer = undefined;
  };
}

/** the current time in whole seconds, `null` on the server and during hydration */
export function useNow(): Date | null {
  const time = useSyncExternalStore(
    subscribe,
    () => now,
    () => 0,
  );
  return time === 0 ? null : new Date(time);
}

export function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}
