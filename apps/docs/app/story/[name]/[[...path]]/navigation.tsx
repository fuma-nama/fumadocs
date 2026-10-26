'use client';
import { type ReactNode, useEffect } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import type { Framework } from 'fumadocs-core/framework';
import { NextProvider } from 'fumadocs-core/framework/next';

/** the layouts' code: loaded ahead, a story navigated to renders without waiting for it */
const PRELOAD: Record<string, () => Promise<unknown>> = {
  docs: () => import('@/components/layout-preview/docs'),
  notebook: () => import('@/components/layout-preview/notebook'),
  flux: () => import('@/components/layout-preview/flux'),
  glass: () => import('@/components/layout-preview/glass'),
  spacious: () => import('@/components/layout-preview/spacious'),
  home: () => import('@/components/layout-preview/home'),
};

// kept across navigations inside the frame, like the story's arguments
const queue: string[] = [];
let loading = false;

/** the queued layouts' code, one per idle moment: the frame shares its parent's main thread */
function preload() {
  const name = queue.shift();
  loading = name !== undefined;
  if (name === undefined) return;
  const run = () => {
    const load = PRELOAD[name];
    if (load) void load().finally(preload);
    else preload();
  };
  if (window.requestIdleCallback) window.requestIdleCallback(run);
  else window.setTimeout(run, 300);
}

/** the story's own links never prefetch: the frame shares its parent's main thread */
const Link: Framework['Link'] = ({ href, ...props }) => (
  <NextLink {...props} href={href ?? '#'} prefetch={false} />
);

export function StoryLinks({ children }: { children: ReactNode }) {
  return <NextProvider Link={Link}>{children}</NextProvider>;
}

/**
 * Lets the page of this site that frames a story move it to another story without a reload,
 * `{ type: 'fumadocs-story:navigate', href }`, or load one ahead, `{ type: 'fumadocs-story:prefetch', href }`.
 * Inert when the story isn't framed.
 */
export function StoryNavigation() {
  const router = useRouter();

  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || e.origin !== location.origin) return;
      const href: unknown = e.data?.href;
      if (typeof href !== 'string' || !href.startsWith('/story/')) return;
      if (e.data.type === 'fumadocs-story:navigate') {
        router.replace(href, { scroll: false });
      } else if (e.data.type === 'fumadocs-story:prefetch') {
        router.prefetch(href);
        const name = href.slice('/story/'.length);
        if (!queue.includes(name)) queue.push(name);
        if (!loading) preload();
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  return null;
}
