import { source } from '@/lib/source';
import { PageProps } from 'waku/router';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { getPageImage } from '@/lib/source';
import { unstable_notFound } from 'waku/router/server';
import { gitConfig } from '@/lib/layout.shared';

export default function Page({ slugs }: PageProps<'/docs/[...slugs]'>) {
  const page = source.getPage(slugs);
  if (!page) unstable_notFound();

  const MDX = page.data.body;
  const markdownUrl = `/llms.mdx/docs/${[...page.slugs, 'index.mdx'].join('/')}`;
  return (
    <DocsPage toc={page.data.toc}>
      <meta property="og:image" content={getPageImage(slugs).url} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={{
            ...defaultMdxComponents,
          }}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function getConfig() {
  const pages = source
    .generateParams()
    .map((item) => (item.lang ? [item.lang, ...item.slug] : item.slug));

  return {
    render: 'static' as const,
    staticPaths: pages,
  } as const;
}
