import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { DefaultNotFound } from 'fumadocs-ui/layouts/home/not-found';
import type { DocsPageProps } from '../app';
import { Provider, resolveLayout, type ProviderProps } from './provider';

/** `layout` is the defaults of `baseOptions()` */
export interface HomeProps extends ProviderProps, Pick<DocsPageProps, 'layout'> {
  locale?: string;
  /** render the not found page of Fumadocs UI */
  notFound?: boolean;
}

export function Home({ provider, layout, locale, notFound, children }: HomeProps) {
  return (
    <Provider provider={provider}>
      <HomeLayout {...resolveLayout(layout, locale)}>
        {notFound ? <DefaultNotFound /> : children}
      </HomeLayout>
    </Provider>
  );
}
