import { createFileRoute, notFound } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { createServerFn } from '@tanstack/react-start';
import { source } from '~/lib/source';
import type { PageTree } from 'fumadocs-core/server';
import { useMemo } from 'react';
import { docs } from '../../../source.generated';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { createClientLoader } from 'fumadocs-mdx/runtime/vite';

export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const data = await loader({ data: params._splat?.split('/') ?? [] });
    await clientLoader.preload(data.path);
    return data;
  },
});

const loader = createServerFn({
  method: 'GET',
})
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) throw notFound();

    return {
      tree: source.pageTree as object,
      path: page.path,
    };
  });

const clientLoader = createClientLoader(docs.doc, {
  id: 'docs',
  component({ toc, frontmatter, default: MDX }) {
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <MDX
            components={{
              ...defaultMdxComponents,
            }}
          />
        </DocsBody>
      </DocsPage>
    );
  },
});

function Page() {
  const data = Route.useLoaderData();
  const Content = clientLoader.getComponent(data.path);
  const tree = useMemo(
    () => transformPageTree(data.tree as PageTree.Folder),
    [data.tree],
  );

  return (
    <DocsLayout
      tree={tree}
      nav={{
        title: 'Fumadocs Tanstack',
      }}
    >
      <Content />
    </DocsLayout>
  );
}

function transformPageTree(tree: PageTree.Folder): PageTree.Folder {
  function page(item: PageTree.Item) {
    if (typeof item.icon !== 'string') return item;

    return {
      ...item,
      icon: (
        <span
          dangerouslySetInnerHTML={{
            __html: item.icon,
          }}
        />
      ),
    };
  }

  return {
    ...tree,
    index: tree.index ? page(tree.index) : undefined,
    children: tree.children.map((item) => {
      if (item.type === 'page') return page(item);
      if (item.type === 'folder') return transformPageTree(item);
      return item;
    }),
  };
}
