import type { Route } from './+types/docs';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { source } from '@/lib/source';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import browserCollections from 'fumadocs-mdx:collections/browser';
import { baseOptions, gitConfig } from '@/lib/layout.shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { LLMCopyButton, ViewOptions } from '@/components/ai/page-actions';
import { getPageImagePath } from '@/lib/og';

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  return {
    path: page.path,
    url: page.url,
    pageTree: await source.serializePageTree(source.getPageTree()),
    imagePath: getPageImagePath(slugs),
  };
}

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: Mdx },
    // you can define props for the `<Content />` component
    {
      path,
      url,
      imagePath,
    }: {
      path: string;
      url: string;
      imagePath: string;
    },
  ) {
    return (
      <DocsPage toc={toc}>
        <title>{frontmatter.title}</title>
        <meta name="description" content={frontmatter.description} />
        <meta property="og:image" content={imagePath} />
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="flex flex-row gap-2 items-center border-b -mt-4 pb-6">
          <LLMCopyButton markdownUrl={`${url}.mdx`} />
          <ViewOptions
            markdownUrl={`${url}.mdx`}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`}
          />
        </div>
        <DocsBody>
          <Mdx components={{ ...defaultMdxComponents }} />
        </DocsBody>
      </DocsPage>
    );
  },
});

export default function Page({ loaderData }: Route.ComponentProps) {
  const { path, url, pageTree, imagePath } = useFumadocsLoader(loaderData);

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      {clientLoader.useContent(path, { path, url, imagePath })}
    </DocsLayout>
  );
}
