import fg from 'fast-glob';
import { printErrors, scanURLs, validateFiles } from 'next-validate-link';
import { getSlugs, parseFilePath } from 'fumadocs-core/source';
import { getTableOfContents } from 'fumadocs-core/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

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
    await fg('content/docs/**/*.mdx').then((files) => files.map(readFromPath)),
  );

  const blogFiles = await Promise.all(
    await fg('content/blog/**/*.mdx').then((files) => files.map(readFromPath)),
  );

  const scanned = await scanURLs({
    populate: {
      '(home)/blog/[slug]': blogFiles.map((file) => {
        const info = parseFilePath(path.relative('content/blog', file.path));

        return { value: getSlugs(info)[0] };
      }),
      'docs/[...slug]': docsFiles.map((file) => {
        const info = parseFilePath(path.relative('content/docs', file.path));

        return {
          value: getSlugs(info),
          hashes: file.data?._mdx?.mirror
            ? undefined
            : getTableOfContents(file.content).map((item) => item.url.slice(1)),
        };
      }),
    },
  });

  console.log(
    `collected ${scanned.urls.size} URLs, ${scanned.fallbackUrls.length} fallbacks`,
  );

  printErrors(
    await validateFiles([...docsFiles, ...blogFiles], {
      scanned,
    }),
    true,
  );
}

void checkLinks();
