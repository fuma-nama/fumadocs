import type { AnchorHTMLAttributes, ReactNode, RefObject } from 'react';
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import scrollIntoView from 'scroll-into-view-if-needed';
import type { TableOfContents } from '@/server/get-toc';
import { mergeRefs } from '@/utils/merge-refs';
import { useAnchorObserver } from './utils/use-anchor-observer';

const ActiveAnchorContext = createContext<string | undefined>(undefined);

const ScrollContext = createContext<RefObject<HTMLElement>>({ current: null });

/**
 * The id of active anchor (doesn't include hash)
 */
export function useActiveAnchor(): string | undefined {
  return useContext(ActiveAnchorContext);
}

export interface AnchorProviderProps {
  toc: TableOfContents;
  children?: ReactNode;
}

export interface ScrollProviderProps {
  /**
   * Scroll into the view of container when active
   */
  containerRef: RefObject<HTMLElement>;

  children?: ReactNode;
}

export function ScrollProvider({
  containerRef,
  children,
}: ScrollProviderProps): React.ReactElement {
  return (
    <ScrollContext.Provider value={containerRef}>
      {children}
    </ScrollContext.Provider>
  );
}

export function AnchorProvider({
  toc,
  children,
}: AnchorProviderProps): React.ReactElement {
  const headings = useMemo(() => {
    return toc.map((item) => item.url.split('#')[1]);
  }, [toc]);

  const activeAnchor = useAnchorObserver(headings);

  return (
    <ActiveAnchorContext.Provider value={activeAnchor}>
      {children}
    </ActiveAnchorContext.Provider>
  );
}

export interface TOCItemProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;

  onActiveChange?: (v: boolean) => void;
}

export const TOCItem = forwardRef<HTMLAnchorElement, TOCItemProps>(
  ({ onActiveChange, ...props }, ref) => {
    const containerRef = useContext(ScrollContext);
    const activeAnchor = useActiveAnchor();
    const anchorRef = useRef<HTMLAnchorElement>(null);
    const mergedRef = mergeRefs(anchorRef, ref);

    const isActive = activeAnchor === props.href.split('#')[1];
    const onActiveRef = useRef<(active: boolean) => void>();

    onActiveRef.current = (active) => {
      const element = anchorRef.current;
      if (!element) return;

      if (active && containerRef.current) {
        scrollIntoView(element, {
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
          scrollMode: 'always',
          boundary: containerRef.current,
        });
      }

      onActiveChange?.(active);
    };

    useEffect(() => {
      onActiveRef.current?.(isActive);
    }, [isActive]);

    return (
      <a ref={mergedRef} data-active={isActive} {...props}>
        {props.children}
      </a>
    );
  },
);

TOCItem.displayName = 'TOCItem';
