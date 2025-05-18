import { glob } from 'tinyglobby';
import { printErrors, scanURLs, validateFiles } from 'next-validate-link';
import { createGetUrl, getSlugs, parseFilePath } from 'fumadocs-core/source';
import { getTableOfContents } from 'fumadocs-core/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { remarkInclude } from 'fumadocs-mdx/config';
import remarkMdx from 'remark-mdx';

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
      hashes: (
        await getTableOfContents(
          {
            path: file.path,
            value: file.content,
          },
          [remarkMdx, remarkInclude],
        )
      ).map((item) => item.url.slice(1)),
    };
  });

  const blogs = blogFiles.map(async (file) => {
    const info = parseFilePath(path.relative('content/blog', file.path));

    return {
      value: getSlugs(info)[0],
      hashes: (
        await getTableOfContents(
          {
            path: file.path,
            value: file.content,
          },
          [remarkMdx, remarkInclude],
        )
      ).map((item) => item.url.slice(1)),
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
