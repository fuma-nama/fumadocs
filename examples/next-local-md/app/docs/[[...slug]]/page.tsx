import { getPageImage, getPageMarkdownUrl, getSource } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/shared';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { findSiblings } from 'fumadocs-core/page-tree';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const docs = await getSource();
  const page = docs.getPage(params.slug);
  if (!page) notFound();

  const { render } = await page.data.load();
  const { toc, body } = await render(
    getMDXComponents({
      // this allows you to link to other pages with relative file paths
      a: createRelativeLink(docs, page),
      DocsCategory({ url = page.url }: { url?: string }) {
        return (
          <Cards>
            {findSiblings(docs.getPageTree(), url).map((item) => {
              if (item.type === 'separator') return;
              if (item.type === 'folder') {
                if (!item.index) return;
                item = item.index;
              }

              return (
                <Card key={item.url} title={item.name} href={item.url}>
                  {item.description}
                </Card>
              );
            })}
          </Cards>
        );
      },
    }),
  );
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage toc={toc} full={page.data.frontmatter.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>{body}</DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const docs = await getSource();
  return docs.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const docs = await getSource();
  const params = await props.params;
  const page = docs.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
