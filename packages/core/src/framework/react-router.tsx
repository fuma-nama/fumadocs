import { type ReactNode, useMemo } from 'react';
import { type Framework, FrameworkProvider } from '@/framework/index';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useRevalidator,
} from 'react-router';

const framework: Framework = {
  usePathname() {
    return useLocation().pathname;
  },
  useParams() {
    return useParams() as Record<string, string | string[]>;
  },
  useRouter() {
    const navigate = useNavigate();
    const revalidator = useRevalidator();

    return useMemo(
      () => ({
        push(url) {
          navigate(url);
        },
        refresh() {
          void revalidator.revalidate();
        },
      }),
      [navigate, revalidator],
    );
  },
  Link({ href, prefetch, ...props }) {
    return (
      <Link to={href!} prefetch={prefetch ? 'intent' : 'none'} {...props}>
        {props.children}
      </Link>
    );
  },
};

export function ReactRouterProvider({ children }: { children: ReactNode }) {
  return <FrameworkProvider {...framework}>{children}</FrameworkProvider>;
}
