'use client';
import { type ReactNode, useRef } from 'react';
import { restore, setStatus } from '../lib/status';
import { address } from '../ui/site-tile';

/** A list whose links show where they lead in the status bar while pointed at or focused */
export function Peek({ className, children }: { className: string; children: ReactNode }) {
  const peeked = useRef<HTMLAnchorElement | null>(null);

  function enter(link: HTMLAnchorElement) {
    peeked.current = link;
    setStatus(`open ${address(link.href)}`);
  }

  function leave() {
    peeked.current = null;
    restore();
  }

  return (
    <ul
      className={className}
      onPointerOver={(event) => {
        const link = (event.target as Element).closest('a');
        if (event.pointerType === 'mouse' && link && link !== peeked.current) enter(link);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') leave();
      }}
      onFocus={(event) => {
        const link = event.target.closest('a');
        if (link?.matches(':focus-visible')) enter(link);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) leave();
      }}
    >
      {children}
    </ul>
  );
}
