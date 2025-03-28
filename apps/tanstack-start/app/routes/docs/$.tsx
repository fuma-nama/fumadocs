import { createFileRoute, notFound } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { executeMdxSync } from '@fumadocs/mdx-remote/client';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { createServerFn } from '@tanstack/react-start';
import type { PageTree } from 'fumadocs-core/server';
import { createCompiler } from '@fumadocs/mdx-remote';

export const Route = createFileRoute('/docs/$')({
  component: Page,
  async loader({ params }) {
    const slugs = (params._splat ?? '').split('/');

    return loader({ data: slugs });
  },
});

const compiler = createCompiler({
  development: false,
});

const loader = createServerFn({
  method: 'GET',
})
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) throw notFound();

    const { content, ...rest } = page.data;
    const compiled = String(
      await compiler.compileFile({
        value: content,
      }),
    );

    return {
      tree: source.pageTree as object,
      ...rest,
      compiled,
    };
  });

function Page() {
  const { tree, compiled, ...data } = Route.useLoaderData();
  const { toc, default: MdxContent } = executeMdxSync(compiled);

  return (
    <DocsLayout
      nav={{
        title: 'Tanstack Start',
      }}
      tree={tree as PageTree.Root}
    >
      <DocsPage toc={toc}>
        <DocsTitle>{data.title}</DocsTitle>
        <DocsDescription>{data.title}</DocsDescription>
        <DocsBody>
          <MdxContent components={defaultMdxComponents} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
