import { type ReactNode, useMemo } from 'react';
import { type Framework, FrameworkProvider } from '@/framework/index';
import {
  useParams,
  Link,
  useRouter,
  useLocation,
} from '@tanstack/react-router';

const framework: Framework = {
  Link({ href, prefetch, ...props }) {
    return (
      <Link to={href} preload={prefetch ? 'intent' : false} {...props}>
        {props.children}
      </Link>
    );
  },
  usePathname() {
    return useLocation().pathname;
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
export function TanstackProvider({ children }: { children: ReactNode }) {
  return <FrameworkProvider {...framework}>{children}</FrameworkProvider>;
}
