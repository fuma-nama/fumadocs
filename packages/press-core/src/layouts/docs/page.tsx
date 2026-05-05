import { getPageImage, getSource, slugsToMarkdownPath } from '@/lib/source';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { unstable_notFound } from 'waku/router/server';
import { AppContext, baseOptions, getGitHubFileUrl } from '@/lib/shared';
import { getMDXComponents } from '@/components/mdx';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

export default async function Page({ slugs, config }: { slugs: string[] } & AppContext) {
  const source = await getSource();
  const page = source.getPage(slugs);
  if (!page) unstable_notFound();

  const { render } = await page.data.load();
  const { body, toc } = await render(
    getMDXComponents({
      // this allows you to link to other pages with relative file paths
      a: createRelativeLink(source, page),
    }),
  );

  const markdownUrl = slugsToMarkdownPath(page.slugs).url;
  return (
    <DocsLayout {...baseOptions(config)} tree={source.getPageTree()}>
      <DocsPage toc={toc}>
        <meta property="og:image" content={getPageImage(slugs).url} />
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
        <div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={page.absolutePath ? getGitHubFileUrl(config, page.absolutePath) : undefined}
          />
        </div>
        <DocsBody>{body}</DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
