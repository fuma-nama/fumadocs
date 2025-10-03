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
import { ReactNode, useMemo } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

export default function ServerComponent({
  params,
}: {
  params: Partial<Record<string, string>>;
}) {
  const slugs = params['*']?.split('/').filter((v) => v.length > 0) ?? [];
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  const { body: MDX } = page.data;

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

function Layout({ page, children }: { page: Page; children: ReactNode }) {
  const layout = page.data.layout;
  console.log(useMemo(() => 'test', []));

  if (layout === 'docs') {
    return (
      <DocsLayout {...baseOptions()} tree={source.pageTree}>
        <DocsPage toc={page.data.toc}>{children}</DocsPage>
      </DocsLayout>
    );
  }

  if (layout === 'home') {
    return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
  }

  return children;
}
