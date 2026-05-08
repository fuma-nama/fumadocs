import { ConfigContext } from '@/config';
import { AppContext, baseOptions, getGitHubFileUrl, renderPageMeta } from '@/lib/shared';
import type { Awaitable } from '@/lib/types';
import type { Page } from 'fumadocs-core/source';
import { TOCItemType } from 'fumadocs-core/toc';
import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import {
  MarkdownCopyButton,
  ViewOptionsPopover,
  DocsPage,
  DocsTitle,
  DocsDescription,
  DocsBody,
  type DocsPageProps,
} from 'fumadocs-ui/layouts/docs/page';
import type { ComponentType, ReactNode } from 'react';
import { unstable_notFound } from 'waku/router/server';

export interface DocsLayoutOptions<C extends ConfigContext = ConfigContext> {
  render?: (
    this: AppContext<C>,
    page: C['loaderConfig']['page'],
  ) => Awaitable<Partial<DocsLayoutRenderData>>;
}

export interface DocsLayoutRenderData {
  markdownUrl?: string;
  body: ReactNode;
  layoutProps: DocsLayoutProps;
  pageProps?: DocsPageProps;
}

export interface DocsLayoutContextData {
  renderers?: ((
    this: { page: Page },
    data: DocsLayoutRenderData,
  ) => Awaitable<DocsLayoutRenderData>)[];
}

export function createDocsLayout<C extends ConfigContext = ConfigContext>({
  render = async function defaultRender(page) {
    let body: ReactNode | undefined;
    let toc: TOCItemType[] | undefined;

    for (const adapter of this.adapters) {
      body = await adapter['core:render-body']?.call(this as unknown as AppContext, page);
      if (body !== undefined) break;
    }

    for (const adapter of this.adapters) {
      toc = await adapter['core:render-toc']?.call(this as unknown as AppContext, page);
      if (toc !== undefined) break;
    }

    if (body === undefined)
      throw new Error('[Fumapress] Please specify the `render` option in createDocsLayout()');

    return {
      body,
      pageProps: { toc },
    };
  },
}: DocsLayoutOptions<C> = {}): ComponentType<AppContext<C> & { slugs: string[] }> {
  return async function Layout(props) {
    const {
      slugs,
      config,
      getLoader,
      data: { 'core:docs-layout': layoutData },
    } = props;
    const source = await getLoader();
    const page = source.getPage(slugs);
    if (!page) unstable_notFound();

    let result = (await render.call(props, page)) as DocsLayoutRenderData;
    result.layoutProps ??= {
      tree: source.getPageTree(),
      ...baseOptions(config),
    };

    if (layoutData?.renderers) {
      const renderCtx = { page };
      for (const r of layoutData.renderers) {
        result = await r.call(renderCtx, result);
      }
    }

    return (
      <DocsLayout {...result.layoutProps}>
        {renderPageMeta(page, props)}
        {result.layoutProps.children}
        <DocsPage {...result.pageProps}>
          {result.pageProps?.children}
          <DocsTitle>{page.data.title}</DocsTitle>
          <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
          <div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
            {result.markdownUrl && <MarkdownCopyButton markdownUrl={result.markdownUrl} />}
            <ViewOptionsPopover
              markdownUrl={result.markdownUrl}
              githubUrl={
                page.absolutePath ? getGitHubFileUrl(config, page.absolutePath) : undefined
              }
            />
          </div>
          <DocsBody>{result.body}</DocsBody>
        </DocsPage>
      </DocsLayout>
    );
  };
}
