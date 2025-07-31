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
    return useMemo(() => {
      const params = new URLSearchParams(query);
      return Object.fromEntries(
        Array.from(params.entries()).map(([key, value]) => [
          key,
          Array.isArray(value) ? value[0] : value,
        ]),
      );
    }, [query]);
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
