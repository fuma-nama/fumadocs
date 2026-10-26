'use client';
import { useEffect } from 'react';

/**
 * In a framed demo, a link leads the whole page instead of moving the frame, which never scrolls;
 * a place on the demo leads to the same place on its docs page, `docs`.
 */
export function TopLinks({ docs }: { docs: string }) {
  useEffect(() => {
    const top = window.top;
    if (!top || top === window) return;
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const link = (event.target as Element).closest('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.download) return;
      const url = new URL(link.href);
      const here = url.origin === location.origin && url.pathname === location.pathname;
      // before the framework's router sees the click
      event.preventDefault();
      top.location.assign(here ? new URL(docs + url.hash, location.origin) : url);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [docs]);

  return null;
}
