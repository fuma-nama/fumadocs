'use client';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import scrollIntoView from 'scroll-into-view-if-needed';
import { mergeRefs } from '@/utils/merge-refs';
import { isEqualShallow } from './utils/is-equal';

export interface TOCItemType {
  title: ReactNode;
  url: string;
  depth: number;
  /** [remark-steps] the step number */
  _step?: number;
}

export type TableOfContents = TOCItemType[];

export interface TOCItemInfo {
  id: string;
  active: boolean;
  /** last time the item is updated */
  t: number;
  /** currently active but not intersecting in viewport */
  fallback: boolean;
  original: TOCItemType;
}

const ObserverContext = createContext<Observer | null>(null);
const ScrollContext = createContext<RefObject<HTMLElement | null> | null>(null);

export interface AnchorProviderProps {
  toc: TOCItemType[];
  /**
   * Only accept one active item at most
   *
   * @defaultValue false
   */
  single?: boolean;
  children?: ReactNode;
}

export interface ScrollProviderProps {
  /**
   * Scroll into the view of container when active
   */
  containerRef: RefObject<HTMLElement | null>;

  children?: ReactNode;
}

/** Optional: add auto-scroll to TOC items. */
export function ScrollProvider({ containerRef, children }: ScrollProviderProps) {
  return <ScrollContext value={containerRef}>{children}</ScrollContext>;
}

export function AnchorProvider({ toc, single = false, children }: AnchorProviderProps) {
  const observer = useMemo(() => new Observer(toc, single), [toc, single]);

  useEffect(() => {
    observer.watch();
    return () => observer.unwatch();
  }, [observer]);

  return <ObserverContext value={observer}>{children}</ObserverContext>;
}

export interface TOCItemProps extends ComponentProps<'a'> {
  autoScroll?: boolean;
  onActiveChange?: (v: boolean) => void;
}

export function TOCItem({
  ref,
  onActiveChange,
  onClick,
  autoScroll = true,
  ...props
}: TOCItemProps) {
  const id = props.href ? getItemId(props.href) : null;
  const containerRef = use(ScrollContext);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const isMountedRef = useRef(false);
  const observer = useObserver();
  const active = useObserverValue((observer) => id !== null && observer.activeAnchors.includes(id));
  const prevActiveRef = useRef(active);

  if (prevActiveRef.current !== active) {
    prevActiveRef.current = active;
    onActiveChange?.(active);
  }

  useEffect(() => {
    if (id === null) return;

    const callback = () => {
      const anchor = anchorRef.current;
      const container = containerRef?.current;

      if (autoScroll && observer.activeAnchor === id && anchor && container) {
        scrollIntoView(anchor, {
          behavior: isMountedRef.current ? 'smooth' : 'instant',
          block: 'center',
          inline: 'center',
          scrollMode: 'always',
          boundary: container,
        });
      }
    };

    callback();
    isMountedRef.current = true;
    return observer.subscribe(callback);
  }, [autoScroll, id, observer, containerRef]);

  return (
    <a
      ref={mergeRefs(anchorRef, ref)}
      data-active={String(active)}
      onClick={(e) => {
        onClick?.(e);
        if (id !== null && !e.defaultPrevented) observer.select(id);
      }}
      {...props}
    />
  );
}

function useObserver() {
  const observer = use(ObserverContext);
  if (!observer) throw new Error(`Component must be used under the <AnchorProvider /> component.`);
  return observer;
}

/** subscribe to a value of the observer, it must be stable between updates */
function useObserverValue<T>(get: (observer: Observer) => T): T {
  const observer = useObserver();
  const getSnapshot = () => get(observer);

  return useSyncExternalStore(observer.subscribe, getSnapshot, getSnapshot);
}

/** @returns static info object, useful for custom rendering logic */
export function useTOC() {
  const observer = useObserver();

  return useMemo(
    () => ({
      get() {
        return observer.items;
      },
      listen: observer.listen.bind(observer),
      unlisten: observer.unlisten.bind(observer),
    }),
    [observer],
  );
}

export function useTOCListener(listener: ChangeListener) {
  const observer = useObserver();
  const callback = useEffectEvent(listener);

  useEffect(() => observer.subscribe(callback), [observer]);
}

export function useTOCSelector<T>(
  select: (items: TOCItemInfo[]) => T,
  isEqual: (a: T, b: T) => boolean = isEqualShallow,
) {
  const cache = useRef<{ items: TOCItemInfo[]; select: typeof select; value: T }>(null);

  return useObserverValue(({ items }) => {
    const prev = cache.current;
    if (prev && prev.items === items && prev.select === select) return prev.value;

    const next = select(items);
    // keep the previous reference when equal, so consumers don't re-render
    const value = prev && isEqual(prev.value, next) ? prev.value : next;
    cache.current = { items, select, value };
    return value;
  });
}

/**
 * The current heading ID
 */
export function useActiveAnchor(): string | undefined {
  return useObserverValue((observer) => observer.activeAnchor);
}

/**
 * The id of visible anchors
 */
export function useActiveAnchors(): string[] {
  return useObserverValue((observer) => observer.activeAnchors);
}

export function useItems(): TOCItemInfo[] {
  return useObserverValue((observer) => observer.items);
}

function getItemId(url: string) {
  if (url.startsWith('#')) return url.slice(1);
  return null;
}

type ChangeListener = (items: TOCItemInfo[]) => void;

/** a heading is in view when this ratio of it is visible */
const VISIBLE_RATIO = 0.9;

class Observer {
  items: TOCItemInfo[];
  /** ids of active items */
  activeAnchors: string[] = [];
  /** id of the current item: the last active one while it is in view, or the first one in view */
  activeAnchor: string | undefined;
  private observer: IntersectionObserver | null = null;
  /** ids of headings in view, see `VISIBLE_RATIO` */
  private visible = new Set<string>();
  private listeners = new Set<ChangeListener>();

  constructor(
    toc: TOCItemType[],
    readonly single: boolean,
  ) {
    this.items = [];
    for (const item of toc) {
      const id = getItemId(item.url);
      if (id) this.items.push({ id, active: false, fallback: false, t: 0, original: item });
    }
  }

  listen(listener: ChangeListener) {
    this.listeners.add(listener);
  }

  unlisten(listener: ChangeListener) {
    this.listeners.delete(listener);
  }

  // arrow function: passed detached to `useSyncExternalStore`
  subscribe = (listener: ChangeListener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  select(id: string) {
    this.activeAnchor = id;
    this.update();
  }

  watch() {
    if (this.observer) return;

    this.observer = new IntersectionObserver(this.callback.bind(this), {
      threshold: VISIBLE_RATIO,
    });
    for (const item of this.items) {
      const element = document.getElementById(item.id);
      if (!element) continue;
      this.observer.observe(element);
    }
  }

  unwatch() {
    this.observer?.disconnect();
    this.observer = null;
    this.visible.clear();
  }

  private callback(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      if (entry.intersectionRatio >= VISIBLE_RATIO) this.visible.add(entry.target.id);
      else this.visible.delete(entry.target.id);
    }

    if (this.activeAnchor === undefined || !this.visible.has(this.activeAnchor)) {
      this.activeAnchor =
        this.items.find((item) => this.visible.has(item.id))?.id ??
        this.findAbove(entries[0].rootBounds);
    }
    this.update();
  }

  /**
   * Measure the last heading above the view, when no heading is in view.
   *
   * Headings can pass the view without intersecting it, so this cannot be tracked from entries.
   */
  private findAbove(root: DOMRectReadOnly | null): string | undefined {
    if (!root) return;
    // headings are entirely above or below the visible area, which contains the viewport center
    const center = (root.top + root.bottom) / 2;
    let id: string | undefined;

    for (const item of this.items) {
      const rect = document.getElementById(item.id)?.getBoundingClientRect();
      // skip hidden headings
      if (!rect || rect.height === 0) continue;
      if (rect.top >= center) break;
      id = item.id;
    }
    return id;
  }

  private update() {
    const activeAnchors: string[] = [];
    const t = Date.now();
    this.items = this.items.map((item) => {
      const active =
        this.single || this.visible.size === 0
          ? item.id === this.activeAnchor
          : this.visible.has(item.id);
      const fallback = active && !this.visible.has(item.id);
      if (active) activeAnchors.push(item.id);
      return item.active === active && item.fallback === fallback
        ? item
        : { ...item, active, fallback, t };
    });
    this.activeAnchors = activeAnchors;
    for (const listener of this.listeners) listener(this.items);
  }
}
