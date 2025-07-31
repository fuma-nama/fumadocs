'use client';

import { type ReactNode, useMemo } from 'react';
import { Link as WakuLink, useRouter } from 'waku';
import { type Framework, FrameworkProvider } from './index.js';

const framework: Framework = {
  usePathname() {
    const { path } = useRouter();
    return path;
  },
  useParams() {
    const { query } = useRouter();
    // Waku doesn't expose params directly from useRouter
    // Instead, we extract them from the query object
    return Object.fromEntries(
      Object.entries(query).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
      ]),
    );
  },
  useRouter() {
    const router = useRouter();

    return useMemo(
      () => ({
        push(url: string) {
          void router.push(url);
        },
        refresh() {
          void router.push(router.path);
        },
      }),
      [router],
    );
  },
  Link({ href, prefetch: _prefetch, ...props }) {
    return (
      <WakuLink to={href!} {...props}>
        {props.children}
      </WakuLink>
    );
  },
};

export function WakuProvider({ children }: { children: ReactNode }) {
  return <FrameworkProvider {...framework}>{children}</FrameworkProvider>;
}
