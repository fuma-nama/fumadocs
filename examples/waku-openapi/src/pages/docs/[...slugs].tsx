import { source } from '@/lib/source';
import { PageProps } from 'waku/router';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { APIPage } from 'fumadocs-openapi/ui';
import { openapi } from '@/lib/openapi';

export default function DocPage({ slugs }: PageProps<'/docs/[...slugs]'>) {
  const page = source.getPage(slugs);

  if (!page) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Page Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          The page you are looking for does not exist.
        </p>
      </div>
    );
  }

  const MDX = page.data.body;
  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={{
            ...defaultMdxComponents,
            APIPage: (props) => <APIPage {...openapi.getAPIPageProps(props)} />,
          }}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function getConfig() {
  const pages = source.getPages().map((page) => page.slugs);

  return {
    render: 'static' as const,
    staticPaths: pages,
  } as const;
}
