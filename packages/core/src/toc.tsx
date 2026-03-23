'use client';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import scrollIntoView from 'scroll-into-view-if-needed';
import { mergeRefs } from '@/utils/merge-refs';
import { useOnChange } from './utils/use-on-change';

export interface TOCItemType {
  title: ReactNode;
  url: string;
  depth: number;
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

const ItemsContext = createContext<TOCItemInfo[] | null>(null);
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
  const [items, setItems] = useState<TOCItemInfo[]>(observer.items);

  observer.single = single;
  useEffect(() => {
    observer.setItems(toc);
  }, [observer, toc]);

  useEffect(() => {
    observer.watch({
      rootMargin: '0px',
      threshold: 0.98,
    });
    observer.onChange = () => setItems(observer.items);

    return () => {
      observer.unwatch();
    };
  }, [observer]);

  return <ItemsContext value={items}>{children}</ItemsContext>;
}

export interface TOCItemProps extends ComponentProps<'a'> {
  onActiveChange?: (v: boolean) => void;
}

export function TOCItem({ ref, onActiveChange = () => null, ...props }: TOCItemProps) {
  const items = useItems();
  const containerRef = use(ScrollContext);
  const id = props.href ? getItemId(props.href) : null;
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [active, setActive] = useState(
    () => id && items.some((item) => item.active && item.id === id),
  );
  const initialShouldScroll = useMemo(() => {
    const lastActive = items.findLast((item) => item.active);
    return lastActive && lastActive.id === id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useOnChange(items, () => {
    if (id === null) return;
    const currentItem = items.find((item) => item.id === id);
    if (!currentItem || currentItem.active === active) return;

    const anchor = anchorRef.current;
    const container = containerRef?.current;
    const isLatestActive =
      currentItem.active && items.every((item) => !item.active || item.t <= currentItem.t);
    if (isLatestActive && container && anchor) {
      scrollIntoView(anchor, {
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
        scrollMode: 'always',
        boundary: container,
      });
    }

    setActive(currentItem.active);
    onActiveChange(currentItem.active);
  });

  useEffect(() => {
    const anchor = anchorRef.current;
    const container = containerRef?.current;

    if (initialShouldScroll && container && anchor) {
      scrollIntoView(anchor, {
        behavior: 'instant',
        block: 'center',
        inline: 'center',
        scrollMode: 'always',
        boundary: container,
      });
    }
  }, [containerRef, initialShouldScroll]);

  return <a ref={mergeRefs(anchorRef, ref)} data-active={active} {...props} />;
}

/**
 * The estimated active heading ID
 */
export function useActiveAnchor(): string | undefined {
  const items = useItems();

  return useMemo(() => {
    let out: TOCItemInfo | undefined;
    for (const item of items) {
      if (!item.active) continue;

      if (!out || item.t > out.t) {
        out = item;
      }
    }

    return out?.id;
  }, [items]);
}

/**
 * The id of visible anchors
 */
export function useActiveAnchors(): string[] {
  const items = useItems();
  return useMemo(() => {
    const out: string[] = [];
    for (const item of items) {
      if (item.active) out.push(item.id);
    }
    return out;
  }, [items]);
}

export function useItems() {
  const ctx = use(ItemsContext);
  if (!ctx) throw new Error(`Component must be used under the <AnchorProvider /> component.`);
  return ctx;
}

function getItemId(url: string) {
  if (url.startsWith('#')) return url.slice(1);
  return null;
}

class Observer {
  items: TOCItemInfo[] = [];
  single = false;
  private observer: IntersectionObserver | null = null;
  onChange?: () => void;

  private callback(entries: IntersectionObserverEntry[]) {
    if (entries.length === 0) return;

    let hasActive = false;
    this.items = this.items.map((item) => {
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

      for (let i = 0; i < this.items.length; i++) {
        const element = document.getElementById(this.items[i].id);
        if (!element) continue;

        const d = Math.abs(viewTop - element.getBoundingClientRect().top);
        if (d < min) {
          fallbackIdx = i;
          min = d;
        }
      }

      if (fallbackIdx !== -1) {
        this.items[fallbackIdx] = {
          ...this.items[fallbackIdx],
          active: true,
          fallback: true,
          t: Date.now(),
        };
      }
    }

    this.onChange?.();
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

    this.items = [];
    for (const item of newItems) {
      const id = getItemId(item.url);
      if (!id) continue;

      this.items.push({
        id,
        active: false,
        fallback: false,
        t: 0,
        original: item,
      });
    }
    this.watchItems();
  }

  watch(options?: IntersectionObserverInit) {
    if (this.observer) return;

    this.observer = new IntersectionObserver(this.callback.bind(this), options);
    this.watchItems();
  }

  private watchItems() {
    if (!this.observer) return;
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
}
