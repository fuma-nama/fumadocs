import { source } from '@/source';
import {
  DocsBody,
  DocsDescription,
  DocsLayout,
  DocsPage,
  DocsTitle,
} from '@/docs/client';

export default async function Page(props: { params: Record<string, string> }) {
  const slugs = props.params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  const Mdx = page.data.default;

  return (
    <DocsLayout
      nav={{
        title: 'React Router',
      }}
      tree={source.pageTree}
    >
      <DocsPage toc={page.data.toc}>
        <title>{page.data.title}</title>
        <meta name="description" content={page.data.description} />
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <Mdx />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
