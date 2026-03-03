import type { PageProps } from 'waku/router';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { getPageImage, getSource, SourcePage } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { layoutConfig } from '@/layouts/config';
import { getConfigRuntime } from '@/config/load-runtime';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { CompileResult, createMarkdownCompiler, plugin } from '@/lib/md';
import { remarkHeading } from 'fumadocs-core/mdx-plugins/remark-heading';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { remarkCodeTab } from 'fumadocs-core/mdx-plugins/remark-code-tab';
import { remarkNpm } from 'fumadocs-core/mdx-plugins/remark-npm';
import { rehypeCode } from 'fumadocs-core/mdx-plugins/rehype-code';
import { rehypeToc } from 'fumadocs-core/mdx-plugins';
import type { TOCItemType } from 'fumadocs-core/toc';
import { Fragment } from 'react/jsx-runtime';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';

const compiler = createMarkdownCompiler({
  remarkPlugins: [
    remarkGfm,
    remarkMath,
    plugin(remarkHeading, { generateToc: false }),
    plugin(remarkNpm, { persist: { id: 'package-manager' } }),
    remarkCodeTab,
  ],
  remarkRehypeOptions: {
    passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement'],
  },
  rehypePlugins: [
    rehypeKatex,
    plugin(rehypeCode, { lazy: true, fallbackLanguage: 'text' }),
    plugin(rehypeToc, { exportToc: { as: 'data' } }),
  ],
});

const mdxComponents = {
  ...defaultMdxComponents,
};

export default async function DocPage({ slugs }: PageProps<'/docs/[...slugs]'>) {
  const source = await getSource();
  const layout = layoutConfig(await getConfigRuntime());
  const page = source.getPage(slugs);

  return (
    <DocsLayout {...await layout.docs()}>
      <Content slugs={slugs} page={page} />
    </DocsLayout>
  );
}

async function Content({ slugs, page }: { slugs: string[]; page?: SourcePage }) {
  const source = await getSource();

  if (!page) {
    if (slugs.length === 0) {
      return (
        <DocsPage>
          <DocsTitle>Home</DocsTitle>
          <DocsDescription>
            You can see all Mardkwon files under the project directory.
          </DocsDescription>
          <Cards>
            {source.getPages().map((page) => {
              return (
                <Card key={page.path} title={page.data.title} href={page.url}>
                  <p>{page.data.description}</p>
                </Card>
              );
            })}
          </Cards>
        </DocsPage>
      );
    }

    return (
      <DocsPage>
        <DocsTitle>Not Found</DocsTitle>
        <DocsDescription>The page you are looking for does not exist.</DocsDescription>
      </DocsPage>
    );
  }

  let compiled: CompileResult | undefined;
  try {
    compiled = await compiler.compile({
      path: page.absolutePath,
      cwd: page.data.project.dir,
      value: page.data.content,
    });
  } catch (e) {
    return (
      <DocsPage>
        <DocsTitle>Failed to Compile</DocsTitle>
        {e instanceof Error ? (
          <>
            <DocsDescription>{e.message}</DocsDescription>
            {e.stack && (
              <CodeBlock>
                <Pre>{e.stack}</Pre>
              </CodeBlock>
            )}
          </>
        ) : (
          <DocsDescription>{String(e)}</DocsDescription>
        )}
      </DocsPage>
    );
  }

  const toc = compiled.file.data.rehypeToc?.map(
    (item): TOCItemType => ({
      ...item,
      title: compiler.render(
        {
          type: 'root',
          children: item.title.children,
        },
        compiled.file,
        mdxComponents,
      ),
    }),
  );

  return (
    <DocsPage toc={toc}>
      <title>{page.data.title}</title>
      <meta property="og:image" content={getPageImage(slugs).url} />
      <meta property="og:description" content={page.data.description} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <Fragment key={page.absolutePath}>{compiled.render(mdxComponents)}</Fragment>
      </DocsBody>
    </DocsPage>
  );
}

export async function getConfig() {
  const staticPaths: string[][] = [];
  let hasIndex = false;

  for (const item of (await getSource()).generateParams()) {
    const staticPath = item.lang ? [item.lang, ...item.slug] : item.slug;
    staticPaths.push(staticPath);
    if (staticPath.length === 0) hasIndex = true;
  }

  if (!hasIndex) staticPaths.push([]);

  return {
    render: 'dynamic',
    staticPaths,
  } as const;
}
