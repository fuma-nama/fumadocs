import { type ReactNode, useRef, useMemo } from 'react';
import { type Framework, FrameworkProvider } from '@/framework/index';
import { useParams, Link, useRouter, useRouterState } from '@tanstack/react-router';

const framework: Framework = {
  Link({ href, prefetch = true, ...props }) {
    return (
      <Link to={href} preload={prefetch ? 'intent' : false} {...props}>
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
