import { createFileRoute, notFound } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { createServerFn } from '@tanstack/react-start';
import { source } from '@/lib/source';
import type { PageTree } from 'fumadocs-core/server';
import { useMemo } from 'react';
import { docs } from '../../../../source.generated';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { createClientLoader } from 'fumadocs-mdx/runtime/vite';
import { baseOptions } from '@/lib/layout.shared';

export const Route = createFileRoute('/$lang/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const data = await loader({
      data: {
        slugs: params._splat?.split('/') ?? [],
        lang: params.lang,
      },
    });

    await clientLoader.preload(data.path);
    return data;
  },
});

const loader = createServerFn({
  method: 'GET',
})
  .validator((params: { slugs: string[]; lang?: string }) => params)
  .handler(async ({ data: { slugs, lang } }) => {
    const page = source.getPage(slugs, lang);
    if (!page) throw notFound();

    return {
      tree: source.getPageTree(lang) as object,
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
  const { lang } = Route.useParams();
  const data = Route.useLoaderData();
  const Content = clientLoader.getComponent(data.path);
  const tree = useMemo(
    () => transformPageTree(data.tree as PageTree.Folder),
    [data.tree],
  );

  return (
    <DocsLayout {...baseOptions(lang)} tree={tree}>
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
