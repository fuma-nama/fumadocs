'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { SelectTabs } from '../components/select-tab';

interface HashTabItem {
  value: string;
  prefix: string;
}

/**
 * A `SelectTabs` wrapper that auto-switches to whichever tab a URL hash
 * targets. Lives in its own client component file so the parent operation
 * tree can keep rendering as a Server Component.
 */
export function HashAwareSelectTabs({
  items,
  fallback,
  children,
}: {
  items: HashTabItem[];
  fallback: string;
  children: ReactNode;
}) {
  const [value, setValue] = useTabValueFromHash(items, fallback);

  return (
    <SelectTabs value={value} onValueChange={setValue}>
      {children}
    </SelectTabs>
  );
}

function useTabValueFromHash(
  items: HashTabItem[],
  fallback: string,
): [string, (value: string) => void] {
  // Always render the fallback on first paint so server-rendered markup and
  // hydration agree; the hash is read inside `useEffect` (client-only) and
  // the tab is corrected after hydration if a deep link is active.
  const [value, setValue] = useState<string>(fallback);

  useEffect(() => {
    function resolve() {
      const next = resolveFromHash(items);
      if (next) setValue(next);
    }
    resolve();
    window.addEventListener('hashchange', resolve);
    return () => window.removeEventListener('hashchange', resolve);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.prefix).join('|')]);

  return [value, setValue];
}

function resolveFromHash(items: HashTabItem[]): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const hash = decodeURIComponent(window.location.hash.slice(1));
  if (!hash) return undefined;
  for (const item of items) {
    if (hash === item.prefix || hash.startsWith(`${item.prefix}.`)) return item.value;
  }
  return undefined;
}
