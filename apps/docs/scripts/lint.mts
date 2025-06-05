/* eslint-disable @typescript-eslint/no-explicit-any -- rehype plugins */
import { glob } from 'tinyglobby';
import { printErrors, scanURLs, validateFiles } from 'next-validate-link';
import { createGetUrl, getSlugs, parseFilePath } from 'fumadocs-core/source';
import { TOCItemType } from 'fumadocs-core/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { remarkInclude } from 'fumadocs-mdx/config';
import remarkMdx from 'remark-mdx';
import { visit } from 'unist-util-visit';
import { remark } from 'remark';
import { remarkHeading } from 'fumadocs-core/mdx-plugins';

async function readFromPath(file: string) {
  const content = await fs
    .readFile(path.resolve(file))
    .then((res) => res.toString());
  const parsed = matter(content);

  return {
    path: file,
    data: parsed.data,
    content: parsed.content,
  };
}

function remarkIncludeId() {
  return (tree: any, file: any) => {
    file.data.ids ??= [];
    visit(tree, 'mdxJsxFlowElement', (element) => {
      if (!element.name || !element.attributes) return;

      const attributes = element.attributes as Record<string, unknown>[];
      const idAttr = attributes.find(
        (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'id',
      );

      if (idAttr) {
        file.data.ids.push(idAttr.value);
      }
    });
  };
}

const processor = remark()
  .use(remarkMdx)
  .use(remarkInclude)
  .use(remarkIncludeId)
  .use(remarkHeading);

async function getHeadings(path: string, content: string) {
  const ids: string[] = [];
  const result = await processor.process({
    path,
    value: content,
  });

  if ('toc' in result.data)
    ids.push(
      ...(result.data.toc as TOCItemType[]).map((item) => item.url.slice(1)),
    );

  if ('ids' in result.data) ids.push(...(result.data.ids as string[]));

  return ids;
}

async function checkLinks() {
  const docsFiles = await Promise.all(
    await glob('content/docs/**/*.mdx').then((files) =>
      files.map(readFromPath),
    ),
  );

  const blogFiles = await Promise.all(
    await glob('content/blog/**/*.mdx').then((files) =>
      files.map(readFromPath),
    ),
  );

  const docs = docsFiles.map(async (file) => {
    const info = parseFilePath(path.relative('content/docs', file.path));

    return {
      value: getSlugs(info),
      hashes: await getHeadings(file.path, file.content),
    };
  });

  const blogs = blogFiles.map(async (file) => {
    const info = parseFilePath(path.relative('content/blog', file.path));

    return {
      value: getSlugs(info)[0],
      hashes: await getHeadings(file.path, file.content),
    };
  });

  const scanned = await scanURLs({
    populate: {
      '(home)/blog/[slug]': await Promise.all(blogs),
      'docs/[...slug]': await Promise.all(docs),
    },
  });

  console.log(
    `collected ${scanned.urls.size} URLs, ${scanned.fallbackUrls.length} fallbacks`,
  );

  const getUrl = createGetUrl('/docs');
  printErrors(
    await validateFiles([...docsFiles, ...blogFiles], {
      scanned,

      pathToUrl(value) {
        const info = parseFilePath(path.relative('content/docs', value));
        return getUrl(getSlugs(info));
      },
    }),
    true,
  );
}

void checkLinks();
