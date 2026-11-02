import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { DefaultNotFound } from 'fumadocs-ui/layouts/home/not-found';
import { Provider, type ProviderProps } from '@/components/provider';
import { baseOptions } from '@/lib/layout.shared';

/**
 * The React island of pages in the home layout, the content is passed as children.
 */
export function Home({ children, ...props }: ProviderProps) {
  return (
    <Provider {...props}>
      <HomeLayout {...baseOptions(props.lang)}>{children}</HomeLayout>
    </Provider>
  );
}

export function NotFound(props: ProviderProps) {
  return (
    <Home {...props}>
      <DefaultNotFound />
    </Home>
  );
}
