import { useSyncExternalStore } from 'react';

interface FigureEntry {
  el: HTMLElement;
  id: string;
  label: string;
}

let status = 'ready';
/** the page's figures in document order, and the first one crossing the middle of the viewport */
let figures: readonly FigureEntry[] = [];
let active: HTMLElement | null = null;
const crossing = new Set<HTMLElement>();
let middle: IntersectionObserver | undefined;
const listeners = new Set<() => void>();
const none: readonly FigureEntry[] = [];

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

/** a new active figure brings its own line to the status */
function update() {
  const [figure = null] = crossing;
  if (figure !== active) {
    active = figure;
    status = figure?.dataset.status ?? 'ready';
  }
  emit();
}

function onMiddle(records: IntersectionObserverEntry[]) {
  for (const record of records) {
    const figure = record.target as HTMLElement;
    if (record.isIntersecting) crossing.add(figure);
    else crossing.delete(figure);
  }
  update();
}

/** `Figure`'s ref callback: the status bar lists the figure and follows it while it is mounted */
export function registerFigure(el: HTMLElement): () => void {
  middle ??= new IntersectionObserver(onMiddle, { rootMargin: '-50% 0px -50% 0px' });
  const entry = { el, id: el.id, label: el.getAttribute('aria-label') ?? el.id };
  // in document order, also when a figure mounts between two others
  figures = [...figures, entry].sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
  middle.observe(el);
  emit();
  return () => {
    middle!.unobserve(el);
    crossing.delete(el);
    figures = figures.filter((item) => item.el !== el);
    update();
  };
}

/** a passing line after `status:` in the status bar, until the next */
export function setStatus(next: string) {
  if (next === status) return;
  status = next;
  emit();
}

/**
 * A figure's own line: kept on the figure, so the status bar shows it again when the reader comes
 * back, and shown now while it is the active figure.
 */
export function report(from: Element, text: string) {
  const figure = from.closest<HTMLElement>('[data-figure]');
  if (!figure || figure.dataset.status === text) return;
  figure.dataset.status = text;
  if (figure === active) setStatus(text);
}

/** after a passing line: the active figure's own line again */
export function restore() {
  setStatus(active?.dataset.status ?? 'ready');
}

function useStore<T>(snapshot: () => T, server: T): T {
  return useSyncExternalStore(subscribe, snapshot, () => server);
}

export function useStatus(): string {
  return useStore(() => status, 'ready');
}

export function useFigures(): readonly FigureEntry[] {
  return useStore(() => figures, none);
}

/** the active figure's id */
export function useActive(): string | null {
  return useStore(() => active?.id ?? null, null);
}
