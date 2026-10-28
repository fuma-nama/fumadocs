import { type ReactNode, useRef, useMemo } from 'react';
import { type Framework, FrameworkProvider } from '@/framework/index';
import { useParams, Link, useRouter, useRouterState } from '@tanstack/react-router';

const framework: Framework = {
  Link({ href = '', prefetch = true, ...props }) {
    const router = useRouter();
    // Tanstack Router drops the hash of same-page anchors, use a native anchor instead
    if (href.startsWith('#')) return <a href={href} {...props} />;

    // `to` only accepts a path, search params and hash are passed separately
    const hashIdx = href.indexOf('#');
    const path = hashIdx === -1 ? href : href.slice(0, hashIdx);
    const searchIdx = path.indexOf('?');

    return (
      <Link
        to={searchIdx === -1 ? path : path.slice(0, searchIdx)}
        search={searchIdx === -1 ? undefined : router.options.parseSearch(path.slice(searchIdx))}
        hash={hashIdx === -1 ? undefined : href.slice(hashIdx + 1)}
        preload={prefetch ? 'intent' : false}
        {...props}
      >
        {props.children}
      </Link>
    );
  },
  usePathname() {
    const { isLoading, pathname } = useRouterState({
      select: (state) => ({
        isLoading: state.isLoading,
        pathname: state.location.pathname,
      }),
    });

    const activePathname = useRef(pathname);
    return useMemo(() => {
      if (isLoading) {
        return activePathname.current;
      }

      activePathname.current = pathname;
      return pathname;
    }, [isLoading, pathname]);
  },
  useRouter() {
    const router = useRouter();

    return useMemo(
      () => ({
        push(url) {
          void router.navigate({
            href: url,
          });
        },
        refresh() {
          void router.invalidate();
        },
      }),
      [router],
    );
  },
  useParams() {
    return useParams({ strict: false });
  },
};

/**
 * Fumadocs adapter for Tanstack Router/Start
 */
export function TanstackProvider({
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
