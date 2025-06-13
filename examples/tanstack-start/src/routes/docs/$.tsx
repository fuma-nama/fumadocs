import { createFileRoute, notFound } from '@tanstack/react-router';
import { executeMdxSync } from '@fumadocs/mdx-remote/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { createServerFn } from '@tanstack/react-start';
import { createCompiler } from '@fumadocs/mdx-remote';
import { source } from '~/lib/source';
import path from 'node:path';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { PageTree } from 'fumadocs-core/server';
import { useMemo } from 'react';

const compiler = createCompiler();

export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = (params._splat ?? '').split('/');
    return loader({ data: slugs });
  },
});

// a wrapper because we don't want `loader` to be called on client-side
const loader = createServerFn({
  method: 'GET',
})
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) throw notFound();

    const { content, ...rest } = page.data;
    const compiled = await compiler.compileFile({
      path: path.resolve('content', page.path),
      value: content,
    });

    return {
      tree: source.pageTree as object,
      ...rest,
      compiled: compiled.toString(),
    };
  });

function Page() {
  const { compiled, ...data } = Route.useLoaderData();
  const { default: MDX, toc } = executeMdxSync(compiled);
  const tree = useMemo(() => {
    function traverse(folder: PageTree.Folder | PageTree.Root) {
      for (const node of folder.children) {
        if (node.type === 'page' && typeof node.icon === 'string') {
          node.icon = (
            <span
              dangerouslySetInnerHTML={{
                __html: node.icon,
              }}
            />
          );
        }

        if (node.type === 'folder') traverse(node);
      }
    }

    const tree = data.tree as PageTree.Root;
    traverse(tree);
    return tree;
  }, [data.tree]);

  return (
    <DocsLayout
      tree={tree}
      nav={{
        title: 'Fumadocs Tanstack',
      }}
    >
      <DocsPage toc={toc}>
        <DocsTitle>{data.title}</DocsTitle>
        <DocsDescription>{data.description}</DocsDescription>
        <DocsBody>
          <MDX
            components={{
              ...defaultMdxComponents,
            }}
          />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
