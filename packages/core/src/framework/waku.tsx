'use client';

import { type ReactNode, useMemo, useRef } from 'react';
import { Link, useRouter } from 'waku/router/client';
import { type Framework, FrameworkProvider } from './index.js';

const framework: Framework = {
  usePathname() {
    return useRouter().path;
  },
  useParams() {
    console.warn('[Fumadocs] useParams() is not supported on Waku');
    return useMemo(() => ({}), []);
  },
  useRouter() {
    const router = useRouter();
    const routerRef = useRef(router);
    routerRef.current = router;

    return useMemo(
      () => ({
        push(url: string) {
          return routerRef.current.push(url);
        },
        refresh() {
          return routerRef.current.reload();
        },
      }),
      [],
    );
  },
  Link({ href, prefetch = true, ...props }) {
    return (
      <Link to={href!} unstable_prefetchOnEnter={prefetch} {...props}>
        {props.children}
      </Link>
    );
  },
};

export function WakuProvider({
  children,
  Link: CustomLink,
  Image: CustomImage,
}: {
  children: ReactNode;
  Link?: Framework['Link'];
  Image?: Framework['Image'];
}) {
  return (
    <FrameworkProvider
      {...framework}
      Link={CustomLink ?? framework.Link}
      Image={CustomImage ?? framework.Image}
    >
      {children}
    </FrameworkProvider>
  );
}
