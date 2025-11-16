import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { type Page, source } from '../../lib/source';
import { baseOptions } from '../../lib/layout.shared';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { type ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

export default async function ServerComponent({
  params,
}: {
  params: Partial<Record<string, string>>;
}) {
  const slugs = params['*']?.split('/').filter((v) => v.length > 0) ?? [];
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  const { body: MDX } = await page.data.load();

  return (
    <Layout page={page}>
      <title>{page.data.title}</title>
      <meta name="description" content={page.data.description} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents }} />
      </DocsBody>
    </Layout>
  );
}

async function Layout({ page, children }: { page: Page; children: ReactNode }) {
  const layout = page.data.layout;

  if (layout === 'docs') {
    const { toc } = await page.data.load();

    return (
      <DocsLayout {...baseOptions()} tree={source.pageTree}>
        <DocsPage toc={toc}>{children}</DocsPage>
      </DocsLayout>
    );
  }

  if (layout === 'home') {
    return (
      <HomeLayout {...baseOptions()}>
        <div className="w-full max-w-fd-container mx-auto p-4">{children}</div>
      </HomeLayout>
    );
  }

  return children;
}
