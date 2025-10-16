import type { Metadata } from 'next';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import defaultComponents from 'fumadocs-ui/mdx';
import { createCompiler, parseFrontmatter } from '@fumadocs/mdx-remote';
import { type Frontmatter, getPage, getPages } from '@/app/docs/utils';

const compiler = createCompiler();

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = await getPage(params.slug);
  if (!page) notFound();

  const {
    frontmatter,
    body: MdxContent,
    toc,
  } = await compiler.compile<Frontmatter>({
    filePath: page.path,
    source: page.content,
  });

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{frontmatter.title}</DocsTitle>
      <DocsDescription>{frontmatter.description}</DocsDescription>
      <DocsBody>
        <MdxContent components={{ ...defaultComponents }} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return (await getPages()).map((page) => ({ slug: page.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = await getPage(params.slug);
  if (!page) notFound();

  const { frontmatter } = parseFrontmatter(page.content);

  return {
    title: frontmatter.title,
  };
}
