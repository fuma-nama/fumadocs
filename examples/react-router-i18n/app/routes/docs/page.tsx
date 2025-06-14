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
import * as path from 'node:path';
import { i18n } from '~/i18n';

const compiler = createCompiler();

export async function loader({ params }: Route.LoaderArgs) {
  const lang = params['lang'] ?? i18n.defaultLanguage;
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs, lang);
  if (!page) throw new Error('Not found');

  const compiled = await compiler.compileFile({
    path: path.resolve('content/docs', page.path),
    value: page.data.content,
  });

  return {
    page,
    compiled: compiled.toString(),
    tree: source.getPageTree(lang),
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
      i18n={i18n}
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
