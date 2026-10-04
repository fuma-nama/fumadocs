'use client';
import { slug } from 'github-slugger';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useSyncExternalStore,
} from 'react';

const AnchorContext = createContext('');

/** Append segments to the anchor IDs below */
export function AnchorSection({ segments, children }: { segments: string[]; children: ReactNode }) {
  return <AnchorContext value={useAnchorId(segments)}>{children}</AnchorContext>;
}

/** the anchor ID of the section, with `segments` slugified and appended by `.` */
export function useAnchorId(segments: false): null;
export function useAnchorId(segments: string[]): string;
export function useAnchorId(segments: string[] | false): string | null;

export function useAnchorId(segments: string[] | false): string | null {
  if (!segments) return null;
  let id = use(AnchorContext);
  for (const segment of segments) {
    const slugged = slug(segment);
    if (slugged) id = id ? `${id}.${slugged}` : slugged;
  }
  return id;
}

/**
 * Call `onLink` to reveal the anchor section whenever the URL hash links into it.
 *
 * Returns a ref for the revealed content, scrolling to the hash once it renders when the browser couldn't.
 */
export function useAnchorLink(segments: string[] | false, onLink: () => void) {
  const id = useAnchorId(segments);
  // the hash when it links into the section, so each link into it reveals it again
  const linked = useSyncExternalStore(
    subscribeHash,
    () => {
      const hash = window.location.hash.slice(1);
      return id !== null && (hash === id || hash.startsWith(`${id}.`)) ? hash : null;
    },
    () => null,
  );
  const link = useEffectEvent(onLink);
  const scroll = useRef(false);

  useEffect(() => {
    if (!linked) return;
    scroll.current = !document.getElementById(linked);
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
