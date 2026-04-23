import { createFileRoute, notFound } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { createServerFn } from '@tanstack/react-start';
import { getPageMarkdownUrl, getSource } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { baseOptions } from '@/lib/layout.shared';
import { gitConfig } from '@/lib/shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { useMemo } from 'react';
import { useMDXComponents } from '@/components/mdx';
import { rendererFromSerialized } from '@fumadocs/local-md/client';

export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/') ?? [];
    return serverLoader({ data: slugs });
  },
});

const serverLoader = createServerFn({
  method: 'GET',
})
  .inputValidator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const source = await getSource();
    const page = source.getPage(slugs);
    if (!page) throw notFound();

    const { serialize } = await page.data.load();

    return {
      path: page.path,
      frontmatter: { ...page.data.frontmatter, _openapi: null },
      render: serialize(),
      markdownUrl: getPageMarkdownUrl(page).url,
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

function Page() {
  const { path, frontmatter, pageTree, markdownUrl, render } = useFumadocsLoader(
    Route.useLoaderData(),
  );
  const renderer = useMemo(() => rendererFromSerialized(render), [render]);
  const { body, toc } = renderer.renderSync(useMDXComponents());

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="flex flex-row gap-2 items-center border-b -mt-4 pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`}
          />
        </div>
        <DocsBody>{body}</DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
