import { HomeLayout } from 'fumadocs-ui/layouts/home';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { DefaultNotFound } from 'fumadocs-ui/layouts/home/not-found';
import { Provider, resolveLayout, type ProviderProps } from './provider';

export interface HomeProps extends ProviderProps {
  /** the defaults of layout options */
  layout: BaseLayoutProps;
  locale?: string;
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
