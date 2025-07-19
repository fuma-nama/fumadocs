import type { Route } from './+types/page';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { source } from '@/source';
import { type PageTree } from 'fumadocs-core/server';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { docs } from '../../content/docs';
import { toClientRenderer } from 'fumadocs-mdx/runtime/vite';

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  return {
    page,
    tree: source.pageTree,
  };
}

const clientLoader = toClientRenderer(
  docs.doc,
  (
    { toc, default: Mdx },
    {
      description,
      title,
    }: {
      title?: string;
      description?: string;
    },
  ) => {
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{title}</DocsTitle>
        <DocsDescription>{description}</DocsDescription>
        <DocsBody>
          <Mdx components={{ ...defaultMdxComponents }} />
        </DocsBody>
      </DocsPage>
    );
  },
);

export default function Page(props: Route.ComponentProps) {
  const { tree, page } = props.loaderData;
  const Content = clientLoader[page.path];

  return (
    <DocsLayout
      nav={{
        title: 'React Router',
      }}
      tree={tree as PageTree.Root}
    >
      <title>{page.data.title}</title>
      <meta name="description" content={page.data.description} />
      <Content {...page.data} />
    </DocsLayout>
  );
}
