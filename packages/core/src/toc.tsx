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
    observer.watch({
      threshold: 0.9,
    });

    return () => observer.unwatch();
  }, [observer]);

  return <ObserverContext value={observer}>{children}</ObserverContext>;
}

export interface TOCItemProps extends ComponentProps<'a'> {
  autoScroll?: boolean;
  onActiveChange?: (v: boolean) => void;
}

export function TOCItem({ ref, onActiveChange, autoScroll = true, ...props }: TOCItemProps) {
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

  return <a ref={mergeRefs(anchorRef, ref)} data-active={active} {...props} />;
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
 * The estimated active heading ID
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

class Observer {
  items: TOCItemInfo[];
  /** ids of active items */
  activeAnchors: string[] = [];
  /** id of the most recently activated item */
  activeAnchor: string | undefined;
  private observer: IntersectionObserver | null = null;
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

  watch(options?: IntersectionObserverInit) {
    if (this.observer) return;

    this.observer = new IntersectionObserver(this.callback.bind(this), options);
    for (const item of this.items) {
      const element = document.getElementById(item.id);
      if (!element) continue;
      this.observer.observe(element);
    }
  }

  unwatch() {
    this.observer?.disconnect();
    this.observer = null;
  }

  private callback(entries: IntersectionObserverEntry[]) {
    if (entries.length === 0) return;

    let hasActive = false;
    const updated = this.items.map((item) => {
      const entry = entries.find((entry) => entry.target.id === item.id);
      let active = entry ? entry.isIntersecting : item.active && !item.fallback;
      if (this.single && hasActive) active = false;

      if (item.active !== active) {
        item = {
          ...item,
          t: Date.now(),
          active,
          fallback: false,
        };
      }

      if (active) hasActive = true;
      return item;
    });

    if (!hasActive && entries[0].rootBounds) {
      const viewTop = entries[0].rootBounds.top;
      let min = Number.MAX_VALUE;
      let fallbackIdx = -1;

      for (let i = 0; i < updated.length; i++) {
        const element = document.getElementById(updated[i].id);
        if (!element) continue;

        const d = Math.abs(viewTop - element.getBoundingClientRect().top);
        if (d < min) {
          fallbackIdx = i;
          min = d;
        }
      }

      if (fallbackIdx !== -1) {
        updated[fallbackIdx] = {
          ...updated[fallbackIdx],
          active: true,
          fallback: true,
          t: Date.now(),
        };
      }
    }

    this.update(updated);
  }

  private update(next: TOCItemInfo[]) {
    let latest: TOCItemInfo | undefined;
    const activeAnchors: string[] = [];
    for (const item of next) {
      if (!item.active) continue;

      activeAnchors.push(item.id);
      if (!latest || item.t > latest.t) latest = item;
    }

    this.items = next;
    this.activeAnchors = activeAnchors;
    this.activeAnchor = latest?.id;
    for (const listener of this.listeners) listener(next);
  }
}
