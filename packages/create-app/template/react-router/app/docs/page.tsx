import type { Route } from './+types/page';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { type PageTree } from 'fumadocs-core/server';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { docs } from '../../source.generated';
import { toClientRenderer } from 'fumadocs-mdx/runtime/vite';

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  return {
    path: page.path,
    tree: source.pageTree,
  };
}

const renderer = toClientRenderer(
  docs.doc,
  ({ toc, default: Mdx, frontmatter }) => {
    return (
      <DocsPage toc={toc}>
        <title>{frontmatter.title}</title>
        <meta name="description" content={frontmatter.description} />
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <Mdx components={{ ...defaultMdxComponents }} />
        </DocsBody>
      </DocsPage>
    );
  },
);

export default function Page(props: Route.ComponentProps) {
  const { tree, path } = props.loaderData;
  const Content = renderer[path];

  return (
    <DocsLayout {...baseOptions()} tree={tree as PageTree.Root}>
      <Content />
    </DocsLayout>
  );
}
