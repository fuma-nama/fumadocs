'use client';
import { createContext, type ReactNode, use, useMemo } from 'react';
import { anchorSegments } from './auto-anchor';

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
