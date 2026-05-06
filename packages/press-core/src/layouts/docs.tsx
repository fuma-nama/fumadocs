import { ConfigContext } from '@/config';
import { AppContext, baseOptions, getGitHubFileUrl } from '@/lib/shared';
import { slugsToImagePath, slugsToMarkdownPath } from '@/lib/source';
import { Awaitable } from '@/lib/types';
import { TOCItemType } from 'fumadocs-core/toc';
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
  render: (page: C['loaderConfig']['page']) => Awaitable<{
    toc?: TOCItemType[];
    body: ReactNode;
  }>;
}

export function createDocsLayout<C extends ConfigContext = ConfigContext>({
  render,
}: DocsLayoutOptions<C>): ComponentType<AppContext<C> & { slugs: string[] }> {
  return async function Layout({ slugs, config, getLoader }) {
    const source = await getLoader();
    const page = source.getPage(slugs);
    if (!page) unstable_notFound();

    const { toc, body } = await render(page);
    const markdownUrl = slugsToMarkdownPath(page.slugs).url;
    return (
      <DocsLayout {...baseOptions(config)} tree={source.getPageTree()}>
        <DocsPage toc={toc}>
          <meta property="og:image" content={slugsToImagePath(slugs).url} />
          <DocsTitle>{page.data.title}</DocsTitle>
          <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
          <div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
            <MarkdownCopyButton markdownUrl={markdownUrl} />
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
