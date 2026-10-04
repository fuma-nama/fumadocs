'use client';
import { createContext, type ReactNode, use, useMemo } from 'react';
import { anchorSegments } from '.';

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

let scrolled: string | undefined;

/** a ref for content the URL hash links into, the browser scrolls to the hash before it renders */
export function scrollToHash(element: HTMLElement | null) {
  const target = document.getElementById(window.location.hash.slice(1));
  // once, not again when the content renders after switching back to it
  if (!element || !target || target.id === scrolled || !element.contains(target)) return;
  scrolled = target.id;
  target.scrollIntoView();
}

export function useAnchorId(segments: false): null;
export function useAnchorId(segments: string[]): string;
export function useAnchorId(segments: string[] | false): string | null;

export function useAnchorId(segments: string[] | false): string | null {
  if (!segments) return null;
  return anchorSegments(...use(AnchorContext), ...segments);
}
