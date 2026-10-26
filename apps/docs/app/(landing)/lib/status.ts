import { useSyncExternalStore } from 'react';

export interface FigureEntry {
  el: HTMLElement;
  id: string;
  label: string;
}

let status = 'ready';
/** the page's figures in document order, and the one covering the middle of the viewport */
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

/** the active figure changed: its own line replaces the status */
function activate(figure: HTMLElement | null) {
  if (figure === active) return;
  active = figure;
  status = figure?.dataset.status ?? 'ready';
  emit();
}

function onMiddle(records: IntersectionObserverEntry[]) {
  for (const record of records) {
    const figure = record.target as HTMLElement;
    if (record.isIntersecting) crossing.add(figure);
    else crossing.delete(figure);
  }
  const [figure = null] = crossing;
  activate(figure);
}

/** `Figure`'s ref callback: the status bar lists the figure and follows it while it is mounted */
export function registerFigure(el: HTMLElement): () => void {
  const observer = (middle ??= new IntersectionObserver(onMiddle, {
    rootMargin: '-50% 0px -50% 0px',
  }));
  const entry: FigureEntry = { el, id: el.id, label: el.getAttribute('aria-label') ?? el.id };
  const next: FigureEntry[] = [];
  let placed = false;
  for (const item of figures) {
    // in document order, also when a figure mounts between two others
    if (!placed && el.compareDocumentPosition(item.el) & Node.DOCUMENT_POSITION_FOLLOWING) {
      next.push(entry);
      placed = true;
    }
    next.push(item);
  }
  if (!placed) next.push(entry);
  figures = next;
  observer.observe(el);
  emit();
  return () => {
    observer.unobserve(el);
    crossing.delete(el);
    const rest: FigureEntry[] = [];
    for (const item of figures) if (item.el !== el) rest.push(item);
    figures = rest;
    if (active === el) {
      const [figure = null] = crossing;
      activate(figure);
    } else emit();
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

export function useStatus(): string {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => 'ready',
  );
}

export function useFigures(): readonly FigureEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => figures,
    () => none,
  );
}

/** the active figure's id */
export function useActive(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => active?.id ?? null,
    () => null,
  );
}
