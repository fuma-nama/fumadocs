import { getPageImage, getPageMarkdownUrl, getSource } from '@/lib/source';
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
import { gitConfig } from '@/lib/shared';
import { getMDXComponents } from '@/components/mdx';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default async function Page({ slugs }: { slugs: string[] }) {
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

  const markdownUrl = getPageMarkdownUrl(page).url;
  return (
    <DocsLayout {...baseOptions()} tree={source.getPageTree()}>
      <DocsPage toc={toc}>
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
        <DocsBody>{body}</DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
