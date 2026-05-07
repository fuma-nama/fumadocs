import { ConfigContext } from '@/config';
import { AppContext, baseOptions, getGitHubFileUrl } from '@/lib/shared';
import type { Awaitable } from '@/lib/types';
import type { Page } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  MarkdownCopyButton,
  ViewOptionsPopover,
  DocsPage,
  DocsTitle,
  DocsDescription,
  DocsBody,
} from 'fumadocs-ui/layouts/docs/page';
import type { ComponentType, ReactNode } from 'react';
import { unstable_notFound } from 'waku/router/server';

export interface DocsLayoutOptions<C extends ConfigContext = ConfigContext> {
  render: (this: AppContext<C>, page: C['loaderConfig']['page']) => Awaitable<DocsLayoutRender>;
}

export interface DocsLayoutRender {
  toc?: TOCItemType[];
  markdownUrl?: string;
  lastModified?: Date | number;
  body: ReactNode;
}

export interface DocsLayoutContextData {
  renderers?: ((this: { page: Page }, result: DocsLayoutRender) => Awaitable<DocsLayoutRender>)[];
}

export function createDocsLayout<C extends ConfigContext = ConfigContext>({
  render,
}: DocsLayoutOptions<C>): ComponentType<AppContext<C> & { slugs: string[] }> {
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

    let result = await render.call(props, page);
    if (layoutData?.renderers) {
      const renderCtx = { page };
      for (const r of layoutData.renderers) {
        result = await r.call(renderCtx, result);
      }
    }

    const { markdownUrl, body, toc } = result;

    return (
      <DocsLayout {...baseOptions(config)} tree={source.getPageTree()}>
        <DocsPage toc={toc}>
          <DocsTitle>{page.data.title}</DocsTitle>
          <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
          <div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
            {markdownUrl && <MarkdownCopyButton markdownUrl={markdownUrl} />}
            <ViewOptionsPopover
              markdownUrl={markdownUrl}
              githubUrl={
                page.absolutePath ? getGitHubFileUrl(config, page.absolutePath) : undefined
              }
            />
          </div>
          <DocsBody>{body}</DocsBody>
        </DocsPage>
      </DocsLayout>
    );
  };
}
