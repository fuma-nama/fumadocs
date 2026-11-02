'use client';
import { type ComponentType, Suspense, useEffect, useSyncExternalStore } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import type { Framework } from 'fumadocs-core/framework';
import { NextProvider } from 'fumadocs-core/framework/next';

type Args = Record<string, unknown>;

// kept across navigations inside the frame
let args: Args | null = null;

function post(type: string) {
  window.parent.postMessage({ type, path: location.pathname }, location.origin);
}

function subscribe(onChange: () => void) {
  const onMessage = (e: MessageEvent) => {
    if (e.source !== window.parent || e.origin !== location.origin) return;
    if (e.data?.type !== 'fumadocs-story:args') return;
    args = e.data.args;
    onChange();
  };
  window.addEventListener('message', onMessage);
  post('fumadocs-story:ready');
  return () => window.removeEventListener('message', onMessage);
}

/** in the story's boundary after it, so it mounts once the lazy story has rendered */
function Rendered() {
  useEffect(() => post('fumadocs-story:rendered'), []);
  return null;
}

/** the story's own links never prefetch: the frame shares its parent's main thread */
const Link: Framework['Link'] = ({ href, ...props }) => (
  <NextLink {...props} href={href ?? '#'} prefetch={false} />
);

/**
 * `<story.Frame />` for the page framing a story: it renders with the arguments that page sends,
 * tells it once it has rendered, `{ type: 'fumadocs-story:rendered' }`, and moves to another story
 * without a reload, `{ type: 'fumadocs-story:navigate', href, args }`.
 */
export function StoryNavigation({ Component }: { Component: ComponentType }) {
  const router = useRouter();
  const value = useSyncExternalStore(
    subscribe,
    () => args,
    () => null,
  );

  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || e.origin !== location.origin) return;
      if (e.data?.type !== 'fumadocs-story:navigate') return;
      const href: unknown = e.data.href;
      if (typeof href !== 'string' || !href.startsWith('/story/')) return;
      // the next story renders with its own arguments as it lands
      args = e.data.args ?? args;
      router.replace(href, { scroll: false });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  return (
    <NextProvider Link={Link}>
      {value && (
        <Suspense>
          <Component {...value} />
          <Rendered />
        </Suspense>
      )}
    </NextProvider>
  );
}
