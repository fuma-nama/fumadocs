'use client';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import scrollIntoView from 'scroll-into-view-if-needed';
import { mergeRefs } from '@/utils/merge-refs';

export interface TOCItemType {
  title: ReactNode;
  url: string;
  depth: number;
}

export type TableOfContents = TOCItemType[];

const ActiveAnchorContext = createContext<string[]>([]);

const ScrollContext = createContext<RefObject<HTMLElement | null>>({
  current: null,
});

/**
 * The estimated active heading ID
 */
export function useActiveAnchor(): string | undefined {
  return useContext(ActiveAnchorContext)[0];
}

/**
 * The id of visible anchors
 */
export function useActiveAnchors(): string[] {
  return useContext(ActiveAnchorContext);
}

export interface AnchorProviderProps {
  toc: TableOfContents;
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

export function ScrollProvider({
  containerRef,
  children,
}: ScrollProviderProps) {
  return (
    <ScrollContext.Provider value={containerRef}>
      {children}
    </ScrollContext.Provider>
  );
}

export function AnchorProvider({
  toc,
  single = false,
  children,
}: AnchorProviderProps) {
  const headings = useMemo(() => {
    return toc.map((item) => item.url.split('#')[1]);
  }, [toc]);

  return (
    <ActiveAnchorContext.Provider value={useAnchorObserver(headings, single)}>
      {children}
    </ActiveAnchorContext.Provider>
  );
}

export interface TOCItemProps extends Omit<ComponentProps<'a'>, 'href'> {
  href: string;
  onActiveChange?: (v: boolean) => void;
}

export function TOCItem({
  ref,
  onActiveChange = () => null,
  ...props
}: TOCItemProps) {
  const containerRef = useContext(ScrollContext);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const activeOrder = useActiveAnchors().indexOf(props.href.slice(1));
  const isActive = activeOrder !== -1;
  const shouldScroll = activeOrder === 0;
  const onActiveChangeEvent = useEffectEvent(onActiveChange);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const container = containerRef.current;

    if (container && anchor && shouldScroll)
      scrollIntoView(anchor, {
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
        scrollMode: 'always',
        boundary: container,
      });
  }, [containerRef, shouldScroll]);

  useEffect(() => {
    return () => onActiveChangeEvent(isActive);
  }, [isActive]);

  return (
    <a ref={mergeRefs(anchorRef, ref)} data-active={isActive} {...props}>
      {props.children}
    </a>
  );
}

/**
 * Find the active heading of page
 *
 * It selects the top heading by default, and the last item when reached the bottom of page.
 *
 * @param watch - An array of element ids to watch
 * @param single - only one active item at most
 * @returns Active anchor
 */
function useAnchorObserver(watch: string[], single: boolean): string[] {
  const observerRef = useRef<IntersectionObserver>(null);
  const [activeAnchor, setActiveAnchor] = useState<string[]>(() => []);
  const stateRef = useRef<{
    visible: Set<string>;
  }>(null);

  const onChange = useEffectEvent((entries: IntersectionObserverEntry[]) => {
    stateRef.current ??= {
      visible: new Set(),
    };
    const state = stateRef.current;

    for (const entry of entries) {
      if (entry.isIntersecting) {
        state.visible.add(entry.target.id);
      } else {
        state.visible.delete(entry.target.id);
      }
    }

    if (state.visible.size === 0) {
      const viewTop = entries[0].rootBounds!.top;
      let fallback: Element | undefined;
      let min = -1;

      for (const id of watch) {
        const element = document.getElementById(id);
        if (!element) continue;

        const d = Math.abs(viewTop - element.getBoundingClientRect().top);
        if (min === -1 || d < min) {
          fallback = element;
          min = d;
        }
      }

      setActiveAnchor(fallback ? [fallback.id] : []);
    } else {
      const items = watch.filter((item) => state.visible.has(item));
      setActiveAnchor(single ? items.slice(0, 1) : items);
    }
  });

  useEffect(() => {
    if (observerRef.current) return;
    observerRef.current = new IntersectionObserver(onChange, {
      rootMargin: '0px',
      threshold: 0.98,
    });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const observer = observerRef.current;
    if (!observer) return;
    const elements = watch.flatMap(
      (heading) => document.getElementById(heading) ?? [],
    );

    for (const element of elements) observer.observe(element);
    return () => {
      for (const element of elements) observer.unobserve(element);
    };
  }, [watch]);

  return activeAnchor;
}
