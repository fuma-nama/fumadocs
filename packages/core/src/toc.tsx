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
  useState,
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
  const observer = useMemo(() => new Observer(), []);

  observer.single = single;
  useEffect(() => {
    observer.setItems(toc);
  }, [observer, toc]);

  useEffect(() => {
    observer.watch({
      threshold: 0.9,
    });

    return () => observer.unwatch();
  }, [observer]);

  return <ObserverContext value={observer}>{children}</ObserverContext>;
}

export interface TOCItemProps extends ComponentProps<'a'> {
  onActiveChange?: (v: boolean) => void;
}

export function TOCItem({ ref, onActiveChange = () => null, ...props }: TOCItemProps) {
  const id = props.href ? getItemId(props.href) : null;
  const containerRef = use(ScrollContext);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const observer = useObserver();
  const [active, setActive] = useState(() =>
    observer.items.some((item) => item.id === id && item.active),
  );

  function autoScroll(items: TOCItemInfo[], instant = false) {
    const anchor = anchorRef.current;
    const container = containerRef?.current;
    if (!id || !anchor || !container) return;

    let lastActive: TOCItemInfo | undefined;
    for (const item of items) {
      if (!item.active) continue;
      if (!lastActive || lastActive.t < item.t) {
        lastActive = item;
      }
    }

    if (lastActive?.id === id) {
      scrollIntoView(anchor, {
        behavior: instant ? 'instant' : 'smooth',
        block: 'center',
        inline: 'center',
        scrollMode: 'always',
        boundary: container,
      });
    }
  }

  useTOCListener((items) => {
    const itemData = id ? items.find((item) => item.id === id) : null;

    if (itemData && itemData.active !== active) {
      setActive(itemData.active);
      onActiveChange(itemData.active);
      autoScroll(items);
    }
  });

  useEffect(() => {
    autoScroll(observer.items, true);
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps -- initial only
  }, [observer]);

  return <a ref={mergeRefs(anchorRef, ref)} data-active={active} {...props} />;
}

function useObserver() {
  const observer = use(ObserverContext);
  if (!observer) throw new Error(`Component must be used under the <AnchorProvider /> component.`);
  return observer;
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

  useEffect(() => {
    observer.listen(callback);
    return () => observer.unlisten(callback);
  }, [observer]);
}

export function useTOCSelector<T>(
  select: (items: TOCItemInfo[]) => T,
  isEqual: (a: T, b: T) => boolean = isEqualShallow,
) {
  const observer = useObserver();
  const [value, setValue] = useState<T>(() => select(observer.items));
  useTOCListener((items) => {
    const next = select(items);
    if (!isEqual(value, next)) setValue(next);
  });

  return value;
}

/**
 * The estimated active heading ID
 */
export function useActiveAnchor(): string | undefined {
  return useTOCSelector((items) => {
    let out: TOCItemInfo | undefined;
    for (const item of items) {
      if (!item.active) continue;

      if (!out || item.t > out.t) {
        out = item;
      }
    }

    return out?.id;
  });
}

/**
 * The id of visible anchors
 */
export function useActiveAnchors(): string[] {
  return useTOCSelector((items) => {
    const out: string[] = [];
    for (const item of items) {
      if (item.active) out.push(item.id);
    }
    return out;
  });
}

export function useItems(): TOCItemInfo[] {
  return useTOCSelector((items) => items);
}

function getItemId(url: string) {
  if (url.startsWith('#')) return url.slice(1);
  return null;
}

type ChangeListener = (items: TOCItemInfo[]) => void;

class Observer {
  items: TOCItemInfo[] = [];
  single = false;
  private observer: IntersectionObserver | null = null;
  private listeners = new Set<ChangeListener>();

  listen(listener: ChangeListener) {
    this.listeners.add(listener);
  }

  unlisten(listener: ChangeListener) {
    this.listeners.delete(listener);
  }

  setItems(newItems: TOCItemType[]) {
    const observer = this.observer;
    if (observer) {
      for (const item of this.items) {
        const element = document.getElementById(item.id);
        if (!element) continue;
        observer.unobserve(element);
      }
    }

    const next: TOCItemInfo[] = [];
    for (const item of newItems) {
      const id = getItemId(item.url);
      if (!id) continue;

      next.push({
        id,
        active: false,
        fallback: false,
        t: 0,
        original: item,
      });
    }

    this.update(next);
    this.observeItems();
  }

  watch(options?: IntersectionObserverInit) {
    if (this.observer) return;

    this.observer = new IntersectionObserver(this.callback.bind(this), options);
    this.observeItems();
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

  private observeItems() {
    if (!this.observer) return;
    for (const item of this.items) {
      const element = document.getElementById(item.id);
      if (!element) continue;
      this.observer.observe(element);
    }
  }

  private update(next: TOCItemInfo[]) {
    this.items = next;
    for (const listener of this.listeners) listener(next);
  }
}
