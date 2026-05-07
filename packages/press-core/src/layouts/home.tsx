import type { ConfigContext } from '@/config';
import { type AppContext, baseOptions } from '@/lib/shared';
import type { Awaitable } from '@/lib/types';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import type { ComponentType, ReactNode } from 'react';
import { unstable_notFound } from 'waku/router/server';

export interface HomeLayoutOptions<C extends ConfigContext = ConfigContext> {
  render: (page: C['loaderConfig']['page']) => Awaitable<{
    body: ReactNode;
  }>;
}

export function createHomeLayout<C extends ConfigContext = ConfigContext>({
  render,
}: HomeLayoutOptions<C>): ComponentType<AppContext<C> & { slugs: string[] }> {
  return async function Layout({ slugs, config, getLoader }) {
    const source = await getLoader();
    const page = source.getPage(slugs);
    if (!page) unstable_notFound();

    const { body } = await render(page);

    return <HomeLayout {...baseOptions(config)}>{body}</HomeLayout>;
  };
}
