import { type ReactNode, useMemo } from 'react';
import { type Framework, FrameworkProvider } from '@/framework/index';
import { Link, useLocation, useNavigate, useParams, useRevalidator } from 'react-router';

if (typeof window !== 'undefined') {
  // Native hash navigation creates entries without state, which the router reads as one `default`
  // key, so `<ScrollRestoration />` restores the position of the entry being left.
  // Listeners run in registration order: this has to be registered before the router's.
  window.addEventListener('popstate', () => {
    if (window.history.state) return;
    window.history.replaceState({ key: Math.random().toString(36).slice(2, 10), idx: null }, '');
  });
}

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

export function ReactRouterProvider({
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
