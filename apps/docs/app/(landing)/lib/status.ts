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

/**
 * A figure's status line: kept on the figure, so the status bar shows it again when the reader
 * comes back, and shown now while the figure covers the middle of the viewport, the one the
 * status bar names.
 */
export function report(from: Element, text: string) {
  const figure = from.closest<HTMLElement>('[data-figure]');
  if (!figure) return;
  figure.dataset.status = text;
  const box = figure.getBoundingClientRect();
  if (box.top < innerHeight / 2 && box.bottom > innerHeight / 2) setStatus(text);
}

export function useStatus(): string {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => 'ready',
  );
}
