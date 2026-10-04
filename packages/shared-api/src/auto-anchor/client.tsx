'use client';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { anchorIdStartsWith, anchorSegments } from '.';

const AnchorContext = createContext<string[]>([]);

/** Append segment to anchor IDs */
export function AnchorSection({ segments, children }: { segments: string[]; children: ReactNode }) {
  const v = use(AnchorContext);

  return (
    <AnchorContext value={useMemo(() => [...v, ...segments], [v, segments])}>
      {children}
    </AnchorContext>
  );
}

export function useAnchorId(segments: false): null;
export function useAnchorId(segments: string[]): string;
export function useAnchorId(segments: string[] | false): string | null;

export function useAnchorId(segments: string[] | false): string | null {
  if (!segments) return null;
  return anchorSegments(...use(AnchorContext), ...segments);
}

/**
 * Call `onLink` to reveal the anchor section whenever the URL hash links into it.
 *
 * Returns a ref for the revealed content, scrolling to the hash once it renders when the browser couldn't.
 */
export function useAnchorLink(segments: string[] | false, onLink: () => void) {
  const id = useAnchorId(segments);
  const linked = useSyncExternalStore(
    subscribeHash,
    () => id !== null && anchorIdStartsWith(window.location.hash.slice(1), id),
    () => false,
  );
  const link = useEffectEvent(onLink);
  const scroll = useRef(false);

  useEffect(() => {
    if (!linked) return;
    scroll.current = !document.getElementById(window.location.hash.slice(1));
    link();
  }, [linked]);

  return useCallback((element: HTMLElement | null) => {
    if (!element || !scroll.current) return;
    scroll.current = false;
    (document.getElementById(window.location.hash.slice(1)) ?? element).scrollIntoView();
  }, []);
}

function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
