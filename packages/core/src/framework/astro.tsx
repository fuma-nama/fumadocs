'use client';

import { type ReactNode, useMemo } from 'react';
import { type Framework, FrameworkProvider } from '@/framework/index';

type AstroParams = Record<string, string | string[] | undefined>;

export interface AstroProviderProps {
  children: ReactNode;
  pathname: string;
  params?: AstroParams;
  navigate?: (url: string) => void | Promise<void>;
  Link?: Framework['Link'];
  Image?: Framework['Image'];
}

function normalizeParams(params: AstroParams = {}): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) out[key] = value;
  }

  return out;
}

/**
 * Fumadocs adapter for Astro with React islands.
 *
 * Pass `pathname` and `params` from `Astro.url.pathname` and `Astro.params`.
 * You can pass `navigate` from `astro:transitions/client` to preserve client navigation.
 */
export function AstroProvider({
  children,
  pathname,
  params,
  navigate,
  Link,
  Image,
}: AstroProviderProps) {
  const resolvedParams = useMemo(() => normalizeParams(params), [params]);

  const framework = useMemo<Framework>(
    () => ({
      usePathname() {
        return pathname;
      },
      useParams() {
        return resolvedParams;
      },
      useRouter() {
        return {
          push(url) {
            if (navigate) return navigate(url);
            window.location.assign(url);
          },
          refresh() {
            window.location.reload();
          },
        };
      },
      Link,
      Image,
    }),
    [Image, Link, navigate, pathname, resolvedParams],
  );

  return <FrameworkProvider {...framework}>{children}</FrameworkProvider>;
}
