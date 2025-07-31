import { source } from '../../source';
import { PageProps } from 'waku/router';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Doc } from '../../components/doc';

export default async function DocPage({
  slugs,
}: PageProps<'/docs/[...slugs]'>) {
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

  const toc = page.data.toc;
  const frontmatter = page.data;
  const MDX = page.data.default;
  return (
    <Doc
      title={frontmatter.title}
      description={frontmatter.description}
      toc={toc}
    >
      <MDX
        components={{
          ...defaultMdxComponents,
        }}
      />
    </Doc>
  );
}

export async function getConfig() {
  const pages = source.getPages().map((page) => page.slugs);

  return {
    render: 'static' as const,
    staticPaths: pages,
  } as const;
}
