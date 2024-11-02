import fg from 'fast-glob';
import { printErrors, scanURLs, validateFiles } from 'next-validate-link';
import { getSlugs, parseFilePath } from 'fumadocs-core/source';
import { getTableOfContents } from 'fumadocs-core/server';
import fs from 'node:fs/promises';
import path from 'node:path';

async function readFromPath(file: string) {
  const content = await fs
    .readFile(path.resolve(file))
    .then((res) => res.toString());

  return {
    path: file,
    content: content,
  };
}

async function checkLinks() {
  // we read them all at once to avoid repeated file read
  const docsFiles = await Promise.all(
    await fg('content/docs/**/*.{md,mdx}').then((files) =>
      files.map(readFromPath),
    ),
  );

  // other collections too!
  const blogFiles = await Promise.all(
    await fg('content/blog/**/*.{md,mdx}').then((files) =>
      files.map(readFromPath),
    ),
  );

  const scanned = await scanURLs({
    populate: {
      '(home)/blog/[slug]': blogFiles.map((file) => {
        const info = parseFilePath(path.relative('content/blog', file.path));

        return { value: getSlugs(info)[0] };
      }),
      'docs/[[...slug]]': docsFiles.map((file) => {
        const info = parseFilePath(path.relative('content/docs', file.path));

        return {
          value: getSlugs(info),
          hashes: getTableOfContents(file.content).map((item) =>
            item.url.slice(1),
          ),
        };
      }),
    },
  });

  printErrors(
    await validateFiles([...docsFiles, ...blogFiles], {
      scanned,
    }),
    true,
  );
}

void checkLinks();
