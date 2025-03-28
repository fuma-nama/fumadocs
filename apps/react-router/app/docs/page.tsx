import type { Route } from './+types/page';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { source } from '~/source';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { executeMdxSync } from '@fumadocs/mdx-remote/client';
import type { PageTree } from 'fumadocs-core/server';
import { createCompiler } from '@fumadocs/mdx-remote';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}
const compiler = createCompiler({
  development: false,
});

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Error('Not found');

  const { compiled } = await compiler.compile({
    source: page.data.content,
    skipRender: true,
  });

  return {
    page,
    compiled,
    tree: source.pageTree,
  };
}

export default function Page(props: Route.ComponentProps) {
  const { page, compiled, tree } = props.loaderData;
  const { default: Mdx, toc } = executeMdxSync(compiled);

  return (
    <DocsLayout
      nav={{
        title: 'React Router',
      }}
      tree={tree as PageTree.Root}
    >
      <DocsPage toc={toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <Mdx components={defaultMdxComponents} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
