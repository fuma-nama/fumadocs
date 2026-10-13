'use client';
import { type FC, useSyncExternalStore } from 'react';

// kept across navigations inside the frame
let args: Record<string, unknown> | null = null;

function subscribe(onChange: () => void) {
  const onMessage = (e: MessageEvent) => {
    if (
      e.source !== window.parent ||
      e.origin !== location.origin ||
      e.data?.type !== 'fumadocs-story:args'
    )
      return;

    args = e.data.args;
    onChange();
  };

  window.addEventListener('message', onMessage);
  window.parent.postMessage({ type: 'fumadocs-story:ready' }, location.origin);
  return () => window.removeEventListener('message', onMessage);
}

/**
 * Render the component with arguments from the story panel embedding this page.
 */
export function StoryFrame({ Component }: { Component: FC }) {
  const value = useSyncExternalStore(
    subscribe,
    () => args,
    () => null,
  );

  return value && <Component {...value} />;
}
