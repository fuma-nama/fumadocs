import type { ConfigContext } from '@/config';
import { type AppContext, baseOptions, renderPageMeta } from '@/lib/shared';
import type { Awaitable } from '@/lib/types';
import type { Layouts } from '@/router';
import type { Page } from 'fumadocs-core/source';
import { HomeLayout, type HomeLayoutProps } from 'fumadocs-ui/layouts/home';
import type { ReactNode } from 'react';
import { unstable_notFound } from 'waku/router/server';

export interface HomeLayoutOptions<C extends ConfigContext = ConfigContext> {
  render?: (
    this: AppContext<C>,
    page: C['loaderConfig']['page'],
  ) => Awaitable<Partial<HomeLayoutRenderData>>;
}

export interface HomeLayoutRenderData {
  body: ReactNode;
  layoutProps: HomeLayoutProps;
}

export interface HomeLayoutContextData {
  renderers?: ((
    this: { page: Page },
    data: HomeLayoutRenderData,
  ) => Awaitable<HomeLayoutRenderData>)[];
}

export function createHomeLayout<C extends ConfigContext = ConfigContext>({
  render = async function renderDefault(page) {
    for (const adapter of this.adapters) {
      const body = await adapter['core:render-body']?.call(this as unknown as AppContext, page);
      if (body !== undefined) return { body };
    }

    throw new Error('[Fumapress] Please specify the `render` option in createHomeLayout()');
  },
}: HomeLayoutOptions<C>): Layouts<C>['page'] {
  return async function Layout(props) {
    const {
      slugs,
      lang,
      getLoader,
      data: { 'core:home-layout': layoutData },
    } = props;
    const source = await getLoader();
    const page = source.getPage(slugs, lang);
    if (!page) unstable_notFound();

    let result = (await render.call(props, page)) as HomeLayoutRenderData;
    result.layoutProps ??= baseOptions(props);

    if (layoutData?.renderers) {
      const renderCtx = { page };
      for (const r of layoutData.renderers) {
        result = await r.call(renderCtx, result);
      }
    }

    return (
      <HomeLayout {...result.layoutProps}>
        {result.layoutProps.children}
        {renderPageMeta(page, props)}
        {result.body}
      </HomeLayout>
    );
  };
}
