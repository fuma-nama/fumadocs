import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { type SourcePage, getSource } from '../lib/source';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { type ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { loadConfig } from '../lib/get-config';
import { createMarkdownRenderer } from 'fumadocs-core/content/md';

const renderer = createMarkdownRenderer();
export default async function ServerComponent({
  params,
}: {
  params: Partial<Record<string, string>>;
}) {
  const slugs = params['*']?.split('/').filter((v) => v.length > 0) ?? [];
  const source = await getSource();
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  return (
    <Layout page={page}>
      <title>{page.data.title}</title>
      <meta name="description" content={page.data.description} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <renderer.MarkdownServer components={{ ...defaultMdxComponents }}>
          {page.data.content}
        </renderer.MarkdownServer>
      </DocsBody>
    </Layout>
  );
}

async function Layout({ page, children }: { page: SourcePage; children: ReactNode }) {
  let layout = page.data.frontmatter.layout;
  if (typeof layout !== 'string') layout = 'docs';

  const config = await loadConfig();

  const { base } = config.layout ?? {};
  if (layout === 'docs') {
    const source = await getSource();

    return (
      <DocsLayout {...base?.()} tree={source.getPageTree()}>
        <DocsPage>{children}</DocsPage>
      </DocsLayout>
    );
  }

  if (layout === 'home') {
    return (
      <HomeLayout {...base?.()}>
        <div className="w-full max-w-(--fd-layout-width) mx-auto p-4">{children}</div>
      </HomeLayout>
    );
  }

  return children;
}
